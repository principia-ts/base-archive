import type { Has, Tag } from "@principia/base/data/Has";
import type { Erase, UnionToIntersection } from "@principia/base/util/types";

import * as A from "@principia/base/data/Array";
import { pipe } from "@principia/base/data/Function";
import { AtomicReference } from "@principia/base/util/support/AtomicReference";

import * as Sy from "./Sync";

export abstract class SyncLayer<R, E, A> {
  readonly hash = new AtomicReference<PropertyKey>(Symbol());

  readonly _R!: (_: R) => void;
  readonly _E!: () => E;
  readonly _A!: () => A;

  setKey(key: PropertyKey) {
    this.hash.set(key);
    return this;
  }

  abstract scope(): Sy.USync<(_: SyncMemoMap) => Sy.Sync<R, E, A>>;

  build(): Sy.Sync<R, E, A> {
    const scope = () => this.scope();
    return Sy.gen(function* (_) {
      const memo = yield* _(Sy.total((): SyncMemoMap => new Map()));
      const scoped = yield* _(scope());
      return yield* _(scoped(memo));
    });
  }
}

export type SyncMemoMap = Map<PropertyKey, any>;

export enum SyncLayerInstructionTag {
  FromSync = "FromSync",
  Fresh = "Fresh",
  Suspend = "Suspend",
  Both = "Both",
  Using = "Using",
  From = "From",
  All = "All"
}

export function getMemoOrElseCreate<R, E, A>(
  layer: SyncLayer<R, E, A>
): (m: SyncMemoMap) => Sy.Sync<R, E, A> {
  return (m) =>
    Sy.gen(function* (_) {
      const inMap = yield* _(Sy.total(() => m.get(layer.hash.get)));

      if (inMap) {
        return yield* _(Sy.succeed(inMap));
      } else {
        return yield* _(
          Sy.gen(function* (_) {
            const f = yield* _(layer.scope());
            const a = yield* _(f(m));
            yield* _(
              Sy.total(() => {
                m.set(layer.hash.get, a);
              })
            );
            return a;
          })
        );
      }
    });
}

export class FromSyncInstruction<R, E, A> extends SyncLayer<R, E, A> {
  readonly _tag = SyncLayerInstructionTag.FromSync;

  constructor(readonly sync: Sy.Sync<R, E, A>) {
    super();
  }

  scope(): Sy.USync<(_: SyncMemoMap) => Sy.Sync<R, E, A>> {
    return Sy.succeed(() => this.sync);
  }
}

export class FreshInstruction<R, E, A> extends SyncLayer<R, E, A> {
  readonly _tag = SyncLayerInstructionTag.Fresh;

  constructor(readonly layer: SyncLayer<R, E, A>) {
    super();
  }

  scope(): Sy.USync<(_: SyncMemoMap) => Sy.Sync<R, E, A>> {
    return Sy.succeed(getMemoOrElseCreate(this.layer));
  }
}

export class SuspendInstruction<R, E, A> extends SyncLayer<R, E, A> {
  readonly _tag = SyncLayerInstructionTag.Suspend;

  constructor(readonly factory: () => SyncLayer<R, E, A>) {
    super();
  }

  scope(): Sy.USync<(_: SyncMemoMap) => Sy.Sync<R, E, A>> {
    return Sy.succeed(getMemoOrElseCreate(this.factory()));
  }
}

export class BothInstruction<R, E, A, R1, E1, A1> extends SyncLayer<R & R1, E | E1, A & A1> {
  readonly _tag = SyncLayerInstructionTag.Both;

  constructor(readonly left: SyncLayer<R, E, A>, readonly right: SyncLayer<R1, E1, A1>) {
    super();
  }

  scopeBoth(self: BothInstruction<R, E, A, R1, E1, A1>) {
    return Sy.succeed((memo: SyncMemoMap) =>
      Sy.gen(function* (_) {
        const l = yield* _(getMemoOrElseCreate(self.left)(memo));
        const r = yield* _(getMemoOrElseCreate(self.right)(memo));

        return { ...l, ...r };
      })
    );
  }

  scope(): Sy.USync<(_: SyncMemoMap) => Sy.Sync<R & R1, E | E1, A & A1>> {
    return this.scopeBoth(this);
  }
}

export class UsingInstruction<R, E, A, R1, E1, A1> extends SyncLayer<
  R & Erase<R1, A>,
  E | E1,
  A & A1
> {
  readonly _tag = SyncLayerInstructionTag.Using;

  constructor(readonly left: SyncLayer<R, E, A>, readonly right: SyncLayer<R1, E1, A1>) {
    super();
  }

  scope(): Sy.Sync<unknown, never, (_: SyncMemoMap) => Sy.Sync<R & Erase<R1, A>, E | E1, A & A1>> {
    return Sy.succeed((_) =>
      pipe(
        getMemoOrElseCreate(this.left)(_),
        Sy.flatMap((l) =>
          pipe(
            getMemoOrElseCreate(this.right)(_),
            Sy.map((r) => ({ ...l, ...r })),
            Sy.give(l)
          )
        )
      )
    );
  }
}

export class FromInstruction<R, E, A, R1, E1, A1> extends SyncLayer<R & Erase<R1, A>, E | E1, A1> {
  readonly _tag = SyncLayerInstructionTag.From;

  constructor(readonly left: SyncLayer<R, E, A>, readonly right: SyncLayer<R1, E1, A1>) {
    super();
  }

  scope(): Sy.USync<(_: SyncMemoMap) => Sy.Sync<R & Erase<R1, A>, E | E1, A1>> {
    return Sy.succeed((_) =>
      pipe(
        getMemoOrElseCreate(this.left)(_),
        Sy.flatMap((l) => pipe(getMemoOrElseCreate(this.right)(_), Sy.give(l)))
      )
    );
  }
}

export type MergeR<Ls extends ReadonlyArray<SyncLayer<any, any, any>>> = UnionToIntersection<
  {
    [k in keyof Ls]: [Ls[k]] extends [SyncLayer<infer X, any, any>]
      ? unknown extends X
        ? never
        : X
      : never;
  }[number]
>;

export type MergeE<Ls extends ReadonlyArray<SyncLayer<any, any, any>>> = {
  [k in keyof Ls]: [Ls[k]] extends [SyncLayer<any, infer X, any>] ? X : never;
}[number];

export type MergeA<Ls extends ReadonlyArray<SyncLayer<any, any, any>>> = UnionToIntersection<
  {
    [k in keyof Ls]: [Ls[k]] extends [SyncLayer<any, any, infer X>]
      ? unknown extends X
        ? never
        : X
      : never;
  }[number]
>;

export class AllInstruction<
  Layers extends ReadonlyArray<SyncLayer<any, any, any>>
> extends SyncLayer<MergeR<Layers>, MergeE<Layers>, MergeA<Layers>> {
  readonly _tag = SyncLayerInstructionTag.All;

  constructor(readonly layers: Layers & { 0: SyncLayer<any, any, any> }) {
    super();
  }

  scope(): Sy.USync<(_: SyncMemoMap) => Sy.Sync<MergeR<Layers>, MergeE<Layers>, MergeA<Layers>>> {
    return Sy.succeed((_) =>
      pipe(
        this.layers,
        A.foldLeft(<Sy.Sync<any, any, any>>Sy.succeed({}), (b, a) =>
          pipe(
            getMemoOrElseCreate(a)(_),
            Sy.flatMap((x) => Sy.map_(b, (k) => ({ ...x, ...k })))
          )
        )
      )
    );
  }
}

export function fromRawSync<R, E, A>(sync: Sy.Sync<R, E, A>): SyncLayer<R, E, A> {
  return new FromSyncInstruction(sync);
}

export function fresh<R, E, A>(layer: SyncLayer<R, E, A>) {
  return new FreshInstruction(layer);
}

export function suspend<R, E, A>(layer: () => SyncLayer<R, E, A>) {
  return new SuspendInstruction(layer);
}

export function fromSync<T>(tag: Tag<T>): <R, E>(_: Sy.Sync<R, E, T>) => SyncLayer<R, E, Has<T>> {
  return (_) => new FromSyncInstruction(pipe(_, Sy.map(tag.of)));
}

export function fromFunction<T>(tag: Tag<T>): <R>(f: (_: R) => T) => SyncLayer<R, never, Has<T>> {
  return (f) => new FromSyncInstruction(pipe(Sy.asks(f), Sy.map(tag.of)));
}

export function fromValue<T>(tag: Tag<T>): (_: T) => SyncLayer<unknown, never, Has<T>> {
  return (_) => new FromSyncInstruction(Sy.succeed(tag.of(_)));
}

export function and<R2, E2, A2>(
  left: SyncLayer<R2, E2, A2>
): <R, E, A>(right: SyncLayer<R, E, A>) => SyncLayer<R & R2, E2 | E, A & A2> {
  return (right) => new BothInstruction(left, right);
}

export function andTo<R2, E2, A2>(
  left: SyncLayer<R2, E2, A2>
): <R, E, A>(right: SyncLayer<R, E, A>) => SyncLayer<R & Erase<R2, A>, E2 | E, A & A2> {
  return (right) => new UsingInstruction(right, left);
}

export function to<R2, E2, A2>(
  left: SyncLayer<R2, E2, A2>
): <R, E, A>(right: SyncLayer<R, E, A>) => SyncLayer<R & Erase<R2, A>, E2 | E, A2> {
  return (right) => new FromInstruction(right, left);
}

export function using<R2, E2, A2>(
  left: SyncLayer<R2, E2, A2>
): <R, E, A>(right: SyncLayer<R, E, A>) => SyncLayer<Erase<R, A2> & R2, E2 | E, A & A2> {
  return (right) => new UsingInstruction(left, right);
}

export function from<R2, E2, A2>(
  left: SyncLayer<R2, E2, A2>
): <R, E, A>(right: SyncLayer<R, E, A>) => SyncLayer<Erase<R, A2> & R2, E2 | E, A> {
  return (right) => new FromInstruction(left, right);
}

export function giveLayer<R, E, A>(
  layer: SyncLayer<R, E, A>
): <R2, E2, A2>(_: Sy.Sync<R2 & A, E2, A2>) => Sy.Sync<R & R2, E | E2, A2> {
  return (_) =>
    pipe(
      layer.build(),
      Sy.flatMap((a) => pipe(_, Sy.give(a)))
    );
}

export function all<Ls extends ReadonlyArray<SyncLayer<any, any, any>>>(
  ...ls: Ls & { 0: SyncLayer<any, any, any> }
): SyncLayer<MergeR<Ls>, MergeE<Ls>, MergeA<Ls>> {
  return new AllInstruction(ls);
}
