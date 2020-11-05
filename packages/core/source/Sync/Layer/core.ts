import type { Erase, UnionToIntersection } from "@principia/prelude/Utils";
import { inspect } from "util";

import * as A from "../../Array";
import { pipe } from "../../Function";
import type { Has, Tag } from "../../Has";
import * as Sy from "./_internal";
import type { SyncMemoMap } from "./model";
import { SyncLayer, SyncLayerInstructionTag } from "./model";

export const getMemoOrElseCreate = <R, E, A>(layer: SyncLayer<R, E, A>) => (m: SyncMemoMap): Sy.Sync<R, E, A> =>
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

export class FromSyncInstruction<R, E, A> extends SyncLayer<R, E, A> {
   readonly _tag = SyncLayerInstructionTag.FromSync;

   constructor(readonly sync: Sy.Sync<R, E, A>) {
      super();
   }

   scope(): Sy.IO<(_: SyncMemoMap) => Sy.Sync<R, E, A>> {
      return Sy.succeed(() => this.sync);
   }
}

export class FreshInstruction<R, E, A> extends SyncLayer<R, E, A> {
   readonly _tag = SyncLayerInstructionTag.Fresh;

   constructor(readonly layer: SyncLayer<R, E, A>) {
      super();
   }

   scope(): Sy.IO<(_: SyncMemoMap) => Sy.Sync<R, E, A>> {
      return Sy.succeed(getMemoOrElseCreate(this.layer));
   }
}

export class SuspendInstruction<R, E, A> extends SyncLayer<R, E, A> {
   readonly _tag = SyncLayerInstructionTag.Suspend;

   constructor(readonly factory: () => SyncLayer<R, E, A>) {
      super();
   }

   scope(): Sy.IO<(_: SyncMemoMap) => Sy.Sync<R, E, A>> {
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

   scope(): Sy.IO<(_: SyncMemoMap) => Sy.Sync<R & R1, E | E1, A & A1>> {
      return this.scopeBoth(this);
   }
}

export class UsingInstruction<R, E, A, R1, E1, A1> extends SyncLayer<R & Erase<R1, A>, E | E1, A & A1> {
   readonly _tag = SyncLayerInstructionTag.Using;

   constructor(readonly left: SyncLayer<R, E, A>, readonly right: SyncLayer<R1, E1, A1>) {
      super();
   }

   scope(): Sy.Sync<unknown, never, (_: SyncMemoMap) => Sy.Sync<R & Erase<R1, A>, E | E1, A & A1>> {
      return Sy.succeed((_) =>
         pipe(
            getMemoOrElseCreate(this.left)(_),
            Sy.chain((l) =>
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

   scope(): Sy.IO<(_: SyncMemoMap) => Sy.Sync<R & Erase<R1, A>, E | E1, A1>> {
      return Sy.succeed((_) =>
         pipe(
            getMemoOrElseCreate(this.left)(_),
            Sy.chain((l) => pipe(getMemoOrElseCreate(this.right)(_), Sy.give(l)))
         )
      );
   }
}

export type MergeR<Ls extends ReadonlyArray<SyncLayer<any, any, any>>> = UnionToIntersection<
   {
      [k in keyof Ls]: [Ls[k]] extends [SyncLayer<infer X, any, any>] ? (unknown extends X ? never : X) : never;
   }[number]
>;

export type MergeE<Ls extends ReadonlyArray<SyncLayer<any, any, any>>> = {
   [k in keyof Ls]: [Ls[k]] extends [SyncLayer<any, infer X, any>] ? X : never;
}[number];

export type MergeA<Ls extends ReadonlyArray<SyncLayer<any, any, any>>> = UnionToIntersection<
   {
      [k in keyof Ls]: [Ls[k]] extends [SyncLayer<any, any, infer X>] ? (unknown extends X ? never : X) : never;
   }[number]
>;

export class AllInstruction<Layers extends ReadonlyArray<SyncLayer<any, any, any>>> extends SyncLayer<
   MergeR<Layers>,
   MergeE<Layers>,
   MergeA<Layers>
> {
   readonly _tag = SyncLayerInstructionTag.All;

   constructor(readonly layers: Layers & { 0: SyncLayer<any, any, any> }) {
      super();
   }

   scope(): Sy.IO<(_: SyncMemoMap) => Sy.Sync<MergeR<Layers>, MergeE<Layers>, MergeA<Layers>>> {
      return Sy.succeed((_) =>
         pipe(
            this.layers,
            A.reduce(<Sy.Sync<any, any, any>>Sy.succeed({}), (b, a) =>
               pipe(
                  getMemoOrElseCreate(a)(_),
                  Sy.chain((x) => Sy.map_(b, (k) => ({ ...x, ...k })))
               )
            )
         )
      );
   }
}

export const fromRawSync = <R, E, A>(sync: Sy.Sync<R, E, A>): SyncLayer<R, E, A> => new FromSyncInstruction(sync);

export const fresh = <R, E, A>(layer: SyncLayer<R, E, A>) => new FreshInstruction(layer);

export const suspend = <R, E, A>(layer: () => SyncLayer<R, E, A>) => new SuspendInstruction(layer);

export const fromSync = <T>(tag: Tag<T>) => <R, E>(_: Sy.Sync<R, E, T>): SyncLayer<R, E, Has<T>> =>
   new FromSyncInstruction(pipe(_, Sy.map(tag.of)));

export const fromFunction = <T>(tag: Tag<T>) => <R>(f: (_: R) => T): SyncLayer<R, never, Has<T>> =>
   new FromSyncInstruction(pipe(Sy.asks(f), Sy.map(tag.of)));

export const fromValue = <T>(tag: Tag<T>) => (_: T): SyncLayer<unknown, never, Has<T>> =>
   new FromSyncInstruction(Sy.succeed(tag.of(_)));

export const and = <R2, E2, A2>(left: SyncLayer<R2, E2, A2>) => <R, E, A>(
   right: SyncLayer<R, E, A>
): SyncLayer<R & R2, E | E2, A & A2> => new BothInstruction(left, right);

export const andTo = <R2, E2, A2>(left: SyncLayer<R2, E2, A2>) => <R, E, A>(
   right: SyncLayer<R, E, A>
): SyncLayer<R & Erase<R2, A>, E | E2, A & A2> => new UsingInstruction(right, left);

export const to = <R2, E2, A2>(left: SyncLayer<R2, E2, A2>) => <R, E, A>(
   right: SyncLayer<R, E, A>
): SyncLayer<R & Erase<R2, A>, E | E2, A2> => new FromInstruction(right, left);

export const using = <R2, E2, A2>(left: SyncLayer<R2, E2, A2>) => <R, E, A>(
   right: SyncLayer<R, E, A>
): SyncLayer<Erase<R, A2> & R2, E | E2, A & A2> => new UsingInstruction(left, right);

export const from = <R2, E2, A2>(left: SyncLayer<R2, E2, A2>) => <R, E, A>(
   right: SyncLayer<R, E, A>
): SyncLayer<Erase<R, A2> & R2, E | E2, A> => new FromInstruction(left, right);

export const giveLayer = <R, E, A>(layer: SyncLayer<R, E, A>) => <R2, E2, A2>(
   _: Sy.Sync<R2 & A, E2, A2>
): Sy.Sync<R & R2, E | E2, A2> =>
   pipe(
      layer.build(),
      Sy.chain((a) => pipe(_, Sy.give(a)))
   );

export const all = <Ls extends ReadonlyArray<SyncLayer<any, any, any>>>(
   ...ls: Ls & { 0: SyncLayer<any, any, any> }
): SyncLayer<MergeR<Ls>, MergeE<Ls>, MergeA<Ls>> => new AllInstruction(ls);
