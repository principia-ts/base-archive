import type { Erase, UnionToIntersection } from "@principia/prelude/Utils";

import * as A from "../../Array/_core";
import { pipe, tuple } from "../../Function";
import type * as H from "../../Has";
import { mergeEnvironments, tag } from "../../Has";
import { insert } from "../../Map";
import { AtomicReference } from "../../Utils/support/AtomicReference";
import { sequential } from "../ExecutionStrategy";
import type { Cause } from "../Exit/Cause";
import type { Exit } from "../Exit/model";
import type { Managed } from "../Managed/model";
import type { Finalizer, ReleaseMap } from "../Managed/ReleaseMap";
import * as RelMap from "../Managed/ReleaseMap";
import type { DefaultEnv } from "../Task";
import * as XP from "../XPromise";
import * as XR from "../XRef";
import * as XRM from "../XRefM";
import * as M from "./_internal/managed";
import * as T from "./_internal/task";

/*
 * -------------------------------------------
 * Layer Model
 * -------------------------------------------
 */

export const URI = "Layer";

export type URI = typeof URI;

export abstract class Layer<R, E, A> {
  readonly hash = new AtomicReference<PropertyKey>(Symbol());

  readonly _R!: (_: R) => void;
  readonly _E!: () => E;
  readonly _A!: () => A;

  constructor() {
    this.use = this.use.bind(this);
  }

  setKey(hash: symbol) {
    this.hash.set(hash);
    return this;
  }

  ["_I"](): LayerInstruction {
    return this as any;
  }

  ["<<<"]<R1, E1, A1>(from: Layer<R1, E1, A1>): Layer<Erase<R, A1> & R1, E | E1, A> {
    return from_(this, from);
  }

  [">>>"]<R1, E1, A1>(to: Layer<R1, E1, A1>): Layer<Erase<R1, A> & R, E | E1, A1> {
    return from_(to, this);
  }

  ["<+<"]<R1, E1, A1>(from: Layer<R1, E1, A1>): Layer<Erase<R, A1> & R1, E | E1, A & A1> {
    return using_(this, from);
  }

  [">+>"]<R1, E1, A1>(to: Layer<R1, E1, A1>): Layer<Erase<R1, A> & R, E | E1, A & A1> {
    return using_(to, this);
  }

  ["+++"]<R1, E1, A1>(and: Layer<R1, E1, A1>): Layer<R & R1, E | E1, A & A1> {
    return and_(this, and);
  }

  use<R1, E1, A1>(task: T.Task<R1 & A, E1, A1>): T.Task<R & R1, E | E1, A1> {
    return M.use_(build(this["+++"](identity<R1>())), (a) => T.giveAll_(task, a));
  }
}

declare module "@principia/prelude/HKT" {
  interface URItoKind<FC, TC, N extends string, K, Q, W, X, I, S, R, E, A> {
    readonly [URI]: Layer<R, E, A>;
  }
}

/*
 * -------------------------------------------
 * Instructions
 * -------------------------------------------
 */

export enum LayerInstructionTag {
  Fold = "LayerFold",
  Map = "LayerMap",
  Chain = "LayerChain",
  Fresh = "LayerRefresh",
  Managed = "LayerManaged",
  Suspend = "LayerSuspend",
  MapBothPar = "LayerMapBothPar",
  AllPar = "LayerAllPar",
  AllSeq = "LayerAllSeq",
  MapBothSeq = "LayerMapBothSeq"
}

/**
 * Type level bound to make sure a layer is complete
 */
export function main<E, A>(layer: Layer<DefaultEnv, E, A>) {
  return layer;
}

export type LayerInstruction =
  | LayerFoldInstruction<any, any, any, any, any, any, any, any>
  | LayerMapInstruction<any, any, any, any>
  | LayerChainInstruction<any, any, any, any, any, any>
  | LayerChainInstruction<any, any, any, any, any, any>
  | LayerFreshInstruction<any, any, any>
  | LayerManagedInstruction<any, any, any>
  | LayerSuspendInstruction<any, any, any>
  | LayerMapBothParInstruction<any, any, any, any, any, any, any>
  | LayerMapBothSeqInstruction<any, any, any, any, any, any, any>
  | LayerAllParInstruction<Layer<any, any, any>[]>
  | LayerAllSeqInstruction<Layer<any, any, any>[]>;

export class LayerFoldInstruction<R, E, A, E1, A1, R2, E2, A2> extends Layer<
  R & R2,
  E1 | E2,
  A1 | A2
> {
  readonly _tag = LayerInstructionTag.Fold;

  constructor(
    readonly layer: Layer<R, E, A>,
    readonly onFailure: Layer<readonly [R, Cause<E>], E1, A1>,
    readonly onSuccess: Layer<A & R2, E2, A2>
  ) {
    super();
  }
}

export class LayerMapInstruction<R, E, A, B> extends Layer<R, E, B> {
  readonly _tag = LayerInstructionTag.Map;

  constructor(readonly layer: Layer<R, E, A>, readonly f: (a: A) => B) {
    super();
  }
}

export class LayerChainInstruction<R, E, A, R1, E1, B> extends Layer<R & R1, E | E1, B> {
  readonly _tag = LayerInstructionTag.Chain;

  constructor(readonly layer: Layer<R, E, A>, readonly f: (a: A) => Layer<R1, E1, B>) {
    super();
  }
}

export class LayerFreshInstruction<R, E, A> extends Layer<R, E, A> {
  readonly _tag = LayerInstructionTag.Fresh;

  constructor(readonly layer: Layer<R, E, A>) {
    super();
  }
}

export class LayerManagedInstruction<R, E, A> extends Layer<R, E, A> {
  readonly _tag = LayerInstructionTag.Managed;

  constructor(readonly managed: Managed<R, E, A>) {
    super();
  }
}

export class LayerSuspendInstruction<R, E, A> extends Layer<R, E, A> {
  readonly _tag = LayerInstructionTag.Suspend;

  constructor(readonly factory: () => Layer<R, E, A>) {
    super();
  }
}

export type MergeR<Ls extends Layer<any, any, any>[]> = UnionToIntersection<
  {
    [k in keyof Ls]: [Ls[k]] extends [Layer<infer X, any, any>]
      ? unknown extends X
        ? never
        : X
      : never;
  }[number]
>;

export type MergeE<Ls extends Layer<any, any, any>[]> = {
  [k in keyof Ls]: [Ls[k]] extends [Layer<any, infer X, any>] ? X : never;
}[number];

export type MergeA<Ls extends Layer<any, any, any>[]> = UnionToIntersection<
  {
    [k in keyof Ls]: [Ls[k]] extends [Layer<any, any, infer X>]
      ? unknown extends X
        ? never
        : X
      : never;
  }[number]
>;

export class LayerMapBothParInstruction<R, E, A, R1, E1, B, C> extends Layer<R & R1, E | E1, C> {
  readonly _tag = LayerInstructionTag.MapBothPar;

  constructor(
    readonly layer: Layer<R, E, A>,
    readonly that: Layer<R1, E1, B>,
    readonly f: (a: A, b: B) => C
  ) {
    super();
  }
}

export class LayerAllParInstruction<Ls extends Layer<any, any, any>[]> extends Layer<
  MergeR<Ls>,
  MergeE<Ls>,
  MergeA<Ls>
> {
  readonly _tag = LayerInstructionTag.AllPar;

  constructor(readonly layers: Ls & { 0: Layer<any, any, any> }) {
    super();
  }
}

export class LayerMapBothSeqInstruction<R, E, A, R1, E1, B, C> extends Layer<R & R1, E | E1, C> {
  readonly _tag = LayerInstructionTag.MapBothSeq;

  constructor(
    readonly layer: Layer<R, E, A>,
    readonly that: Layer<R1, E1, B>,
    readonly f: (a: A, b: B) => C
  ) {
    super();
  }
}

export class LayerAllSeqInstruction<Ls extends Layer<any, any, any>[]> extends Layer<
  MergeR<Ls>,
  MergeE<Ls>,
  MergeA<Ls>
> {
  readonly _tag = LayerInstructionTag.AllSeq;

  constructor(readonly layers: Ls & { 0: Layer<any, any, any> }) {
    super();
  }
}

export type RIO<R, A> = Layer<R, never, A>;

export function _build<R, E, A>(
  layer: Layer<R, E, A>
): Managed<unknown, never, (_: MemoMap) => Managed<R, E, A>> {
  const I = layer._I();

  switch (I._tag) {
    case LayerInstructionTag.Fresh: {
      return M.succeed(() => build(I.layer));
    }
    case LayerInstructionTag.Managed: {
      return M.succeed(() => I.managed);
    }
    case LayerInstructionTag.Suspend: {
      return M.succeed((memo) => memo.getOrElseMemoize(I.factory()));
    }
    case LayerInstructionTag.Map: {
      return M.succeed((memo) => M.map_(memo.getOrElseMemoize(I.layer), I.f));
    }
    case LayerInstructionTag.Chain: {
      return M.succeed((memo) =>
        M.chain_(memo.getOrElseMemoize(I.layer), (a) => memo.getOrElseMemoize(I.f(a)))
      );
    }
    case LayerInstructionTag.MapBothPar: {
      return M.succeed((memo) =>
        M.mapBothPar_(memo.getOrElseMemoize(I.layer), memo.getOrElseMemoize(I.that), I.f)
      );
    }
    case LayerInstructionTag.MapBothSeq: {
      return M.succeed((memo) =>
        M.mapBoth_(memo.getOrElseMemoize(I.layer), memo.getOrElseMemoize(I.that), I.f)
      );
    }
    case LayerInstructionTag.AllPar: {
      return M.succeed((memo) => {
        return pipe(
          M.foreachPar_(I.layers as Layer<any, any, any>[], memo.getOrElseMemoize),
          M.map(A.reduce({} as any, (b, a) => ({ ...b, ...a })))
        );
      });
    }
    case LayerInstructionTag.AllSeq: {
      return M.succeed((memo) => {
        return pipe(
          M.foreach_(I.layers as Layer<any, any, any>[], memo.getOrElseMemoize),
          M.map(A.reduce({} as any, (b, a) => ({ ...b, ...a })))
        );
      });
    }
    case LayerInstructionTag.Fold: {
      return M.succeed((memo) =>
        M.foldCauseM_(
          memo.getOrElseMemoize(I.layer),
          (e) =>
            pipe(
              T.toManaged()(T.ask<any>()),
              M.chain((r) => M.gives_(memo.getOrElseMemoize(I.onFailure), () => tuple(r, e)))
            ),
          (r) =>
            M.gives_(memo.getOrElseMemoize(I.onSuccess), (x) =>
              typeof x === "object" && typeof r === "object"
                ? {
                    ...x,
                    ...r
                  }
                : r
            )
        )
      );
    }
  }
}

export function build<R, E, A>(_: Layer<R, E, A>): M.Managed<R, E, A> {
  return pipe(
    M.do,
    M.bindS("memoMap", () => M.fromTask(makeMemoMap())),
    M.bindS("run", () => _build(_)),
    M.bindS("value", ({ memoMap, run }) => run(memoMap)),
    M.map(({ value }) => value)
  );
}

export function pure<T>(has: H.Tag<T>): (resource: T) => Layer<unknown, never, H.Has<T>> {
  return (resource) =>
    new LayerManagedInstruction(
      M.chain_(M.fromTask(T.pure(resource)), (a) => environmentFor(has, a))
    );
}

export function identity<R>(): Layer<R, never, R> {
  return fromRawManaged(M.ask<R>());
}

export function prepare<T>(has: H.Tag<T>) {
  return <R, E, A extends T>(acquire: T.Task<R, E, A>) => ({
    open: <R1, E1>(open: (_: A) => T.Task<R1, E1, any>) => ({
      release: <R2>(release: (_: A) => T.Task<R2, never, any>) =>
        fromManaged(has)(
          M.chain_(
            M.makeExit_(acquire, (a) => release(a)),
            (a) => M.fromTask(T.map_(open(a), () => a))
          )
        )
    }),
    release: <R2>(release: (_: A) => T.Task<R2, never, any>) =>
      fromManaged(has)(M.makeExit_(acquire, (a) => release(a)))
  });
}

export function create<T>(has: H.Tag<T>) {
  return {
    fromTask: fromTask(has),
    fromManaged: fromManaged(has),
    pure: pure(has),
    prepare: prepare(has)
  };
}

export function fromTask<T>(
  has: H.Tag<T>
): <R, E>(resource: T.Task<R, E, T>) => LayerManagedInstruction<R, E, H.Has<T>> {
  return (resource) =>
    new LayerManagedInstruction(M.chain_(M.fromTask(resource), (a) => environmentFor(has, a)));
}

export function fromManaged<T>(
  has: H.Tag<T>
): <R, E>(resource: Managed<R, E, T>) => Layer<R, E, H.Has<T>> {
  return (resource) =>
    new LayerManagedInstruction(M.chain_(resource, (a) => environmentFor(has, a)));
}

export function fromRawManaged<R, E, A>(resource: Managed<R, E, A>): Layer<R, E, A> {
  return new LayerManagedInstruction(resource);
}

export function fromRawTask<R, E, A>(resource: T.Task<R, E, A>): Layer<R, E, A> {
  return new LayerManagedInstruction(M.fromTask(resource));
}

export function fromRawFunction<A, B>(f: (a: A) => B): Layer<A, never, B> {
  return fromRawTask(T.asks(f));
}

export function fromRawFunctionM<A, R, E, B>(f: (a: A) => T.Task<R, E, B>): Layer<R & A, E, B> {
  return fromRawTask(T.asksM(f));
}

export function using_<R, E, A, R2, E2, A2>(
  self: Layer<R & A2, E, A>,
  from: Layer<R2, E2, A2>,
  noErase: "no-erase"
): Layer<R & R2, E | E2, A & A2>;
export function using_<R, E, A, R2, E2, A2>(
  self: Layer<R, E, A>,
  from: Layer<R2, E2, A2>
): Layer<Erase<R, A2> & R2, E | E2, A & A2>;
export function using_<R, E, A, R2, E2, A2>(
  self: Layer<R, E, A>,
  from: Layer<R2, E2, A2>
): Layer<Erase<R, A2> & R2, E | E2, A & A2> {
  return fold_<Erase<R, A2> & R2, E2, A2, E2, never, Erase<R, A2> & R2, E | E2, A2 & A>(
    from,
    fromRawFunctionM((_: readonly [R & R2, Cause<E2>]) => T.halt(_[1])),
    and_(from, self)
  );
}

export function from_<R, E, A, R2, E2, A2>(
  self: Layer<R & A2, E, A>,
  to: Layer<R2, E2, A2>,
  noErase: "no-erase"
): Layer<R & R2, E | E2, A>;
export function from_<R, E, A, R2, E2, A2>(
  self: Layer<R, E, A>,
  to: Layer<R2, E2, A2>
): Layer<Erase<R, A2> & R2, E | E2, A>;
export function from_<R, E, A, R2, E2, A2>(
  self: Layer<R, E, A>,
  to: Layer<R2, E2, A2>
): Layer<Erase<R, A2> & R2, E | E2, A> {
  return fold_<Erase<R, A2> & R2, E2, A2, E2, never, Erase<R, A2> & R2, E | E2, A>(
    to,
    fromRawFunctionM((_: readonly [R & R2, Cause<E2>]) => T.halt(_[1])),
    self
  );
}

export function both_<R, E, A, R2, E2, A2>(
  left: Layer<R, E, A>,
  right: Layer<R2, E2, A2>
): Layer<R & R2, E | E2, readonly [A, A2]> {
  return new LayerMapBothSeqInstruction(left, right, tuple);
}

export function both<R2, E2, A2>(
  right: Layer<R2, E2, A2>
): <R, E, A>(left: Layer<R, E, A>) => Layer<R & R2, E2 | E, readonly [A, A2]> {
  return (left) => both_(left, right);
}

export function and_<R, E, A, R2, E2, A2>(
  left: Layer<R, E, A>,
  right: Layer<R2, E2, A2>
): Layer<R & R2, E | E2, A & A2> {
  return new LayerMapBothParInstruction(left, right, (l, r) => ({ ...l, ...r }));
}

export function and<R2, E2, A2>(
  right: Layer<R2, E2, A2>
): <R, E, A>(left: Layer<R, E, A>) => Layer<R & R2, E2 | E, A & A2> {
  return (left) => and_(left, right);
}

export function fold_<R, E, A, E1, B, R2, E2, C>(
  layer: Layer<R, E, A>,
  onFailure: Layer<readonly [R, Cause<E>], E1, B>,
  onSuccess: Layer<A & R2, E2, C>
): Layer<R & R2, E1 | E2, B | C> {
  return new LayerFoldInstruction<R, E, A, E1, B, R2, E2, C>(layer, onFailure, onSuccess);
}

export function andTo<R1, E1, A1>(
  right: Layer<R1, E1, A1>,
  noErase: "no-erase"
): <R, E, A>(left: Layer<R & A1, E, A>) => Layer<R & R1, E | E1, A & A1>;
export function andTo<R1, E1, A1>(
  right: Layer<R1, E1, A1>
): <R, E, A>(left: Layer<R, E, A>) => Layer<Erase<R, A1> & R1, E | E1, A & A1>;
export function andTo<R1, E1, A1>(
  right: Layer<R1, E1, A1>
): <R, E, A>(left: Layer<R, E, A>) => Layer<Erase<R, A1> & R1, E | E1, A & A1> {
  return (left) => andTo_(left, right);
}

export function andTo_<R, E, A, R1, E1, A1>(
  left: Layer<R, E, A>,
  right: Layer<R1, E1, A1>,
  noErase: "no-erase"
): Layer<R & R1, E | E1, A & A1>;
export function andTo_<R, E, A, R1, E1, A1>(
  left: Layer<R, E, A>,
  right: Layer<R1, E1, A1>
): Layer<Erase<R, A1> & R1, E | E1, A & A1>;
export function andTo_<R, E, A, R2, E2, A2>(
  left: Layer<R, E, A>,
  right: Layer<R2, E2, A2>
): Layer<Erase<R, A2> & R2, E | E2, A & A2> {
  return fold_<Erase<R, A2> & R2, E2, A2, E2, never, Erase<R, A2> & R2, E | E2, A2 & A>(
    right,
    fromRawFunctionM((_: readonly [R & R2, Cause<E2>]) => T.halt(_[1])),
    and_(right, left)
  );
}

export function to<R, E, A>(
  to: Layer<R, E, A>
): <R2, E2, A2>(layer: Layer<R2, E2, A2>) => Layer<Erase<R, A2> & R2, E | E2, A> {
  return (layer) => to_(layer, to);
}

export function to_<R, E, A, R2, E2, A2>(
  layer: Layer<R2, E2, A2>,
  to: Layer<R, E, A>
): Layer<Erase<R, A2> & R2, E | E2, A> {
  return fold_<Erase<R, A2> & R2, E2, A2, E2, never, Erase<R, A2> & R2, E | E2, A>(
    layer,
    fromRawFunctionM((_: readonly [R & R2, Cause<E2>]) => T.halt(_[1])),
    to
  );
}

export function andSeq_<R, E, A, R1, E1, A1>(
  layer: Layer<R, E, A>,
  that: Layer<R1, E1, A1>
): Layer<R & R1, E | E1, A & A1> {
  return new LayerMapBothSeqInstruction(layer, that, (l, r) => ({ ...l, ...r }));
}

export function andSeq<R1, E1, A1>(
  that: Layer<R1, E1, A1>
): <R, E, A>(layer: Layer<R, E, A>) => Layer<R & R1, E1 | E, A & A1> {
  return (layer) => andSeq_(layer, that);
}

export function all<Ls extends Layer<any, any, any>[]>(
  ...ls: Ls & { 0: Layer<any, any, any> }
): Layer<MergeR<Ls>, MergeE<Ls>, MergeA<Ls>> {
  return new LayerAllParInstruction(ls);
}

export function allPar<Ls extends Layer<any, any, any>[]>(
  ...ls: Ls & { 0: Layer<any, any, any> }
): Layer<MergeR<Ls>, MergeE<Ls>, MergeA<Ls>> {
  return new LayerAllSeqInstruction(ls);
}

function environmentFor<T>(has: H.Tag<T>, a: T): Managed<unknown, never, H.Has<T>>;
function environmentFor<T>(has: H.Tag<T>, a: T): Managed<unknown, never, any> {
  return M.fromTask(
    T.asks((r) => ({
      [has.key]: mergeEnvironments(has, r, a as any)[has.key]
    }))
  );
}

/**
 * A `MemoMap` memoizes dependencies.
 */

export class MemoMap {
  constructor(
    readonly ref: XRM.RefM<ReadonlyMap<PropertyKey, readonly [T.EIO<any, any>, Finalizer]>>
  ) {}

  /**
   * Checks the memo map to see if a dependency exists. If it is, immediately
   * returns it. Otherwise, obtains the dependency, stores it in the memo map,
   * and adds a finalizer to the outer `Managed`.
   */
  getOrElseMemoize = <R, E, A>(layer: Layer<R, E, A>) =>
    new M.Managed<R, E, A>(
      pipe(
        this.ref,
        XRM.modify((m) => {
          const inMap = m.get(layer.hash.get);

          if (inMap) {
            const [acquire, release] = inMap;

            const cached = T.asksM(([_, rm]: readonly [R, ReleaseMap]) =>
              pipe(
                acquire as T.EIO<E, A>,
                T.onExit((ex) => {
                  switch (ex._tag) {
                    case "Success": {
                      return RelMap.add(release)(rm);
                    }
                    case "Failure": {
                      return T.unit();
                    }
                  }
                }),
                T.map((x) => [release, x] as readonly [Finalizer, A])
              )
            );

            return T.pure(tuple(cached, m));
          } else {
            return pipe(
              T.do,
              T.bindS("observers", () => XR.makeRef(0)),
              T.bindS("promise", () => XP.make<E, A>()),
              T.bindS("finalizerRef", () => XR.makeRef<Finalizer>(RelMap.noopFinalizer)),
              T.letS("resource", ({ finalizerRef, observers, promise }) =>
                T.uninterruptibleMask(({ restore }) =>
                  pipe(
                    T.do,
                    T.bindS("env", () => T.ask<readonly [R, ReleaseMap]>()),
                    T.letS("a", ({ env: [a] }) => a),
                    T.letS("outerReleaseMap", ({ env: [_, outerReleaseMap] }) => outerReleaseMap),
                    T.bindS("innerReleaseMap", () => RelMap.make),
                    T.bindS("tp", ({ a, innerReleaseMap, outerReleaseMap }) =>
                      restore(
                        pipe(
                          T.giveAll_(
                            pipe(
                              _build(layer),
                              M.chain((_) => _(this))
                            ).task,
                            [a, innerReleaseMap]
                          ),
                          T.result,
                          T.chain((e) => {
                            switch (e._tag) {
                              case "Failure": {
                                return pipe(
                                  promise,
                                  XP.halt(e.cause),
                                  T.chain(
                                    () =>
                                      M.releaseAll(e, sequential)(innerReleaseMap) as T.EIO<E, any>
                                  ),
                                  T.chain(() => T.halt(e.cause))
                                );
                              }
                              case "Success": {
                                return pipe(
                                  T.do,
                                  T.tap(() =>
                                    finalizerRef.set((e) =>
                                      T.whenM(
                                        pipe(
                                          observers,
                                          XR.modify((n) => [n === 1, n - 1])
                                        )
                                      )(M.releaseAll(e, sequential)(innerReleaseMap) as T.IO<any>)
                                    )
                                  ),
                                  T.tap(() =>
                                    pipe(
                                      observers,
                                      XR.update((n) => n + 1)
                                    )
                                  ),
                                  T.bindS("outerFinalizer", () =>
                                    RelMap.add((e) => T.chain_(finalizerRef.get, (f) => f(e)))(
                                      outerReleaseMap
                                    )
                                  ),
                                  T.tap(() => pipe(promise, XP.succeed(e.value[1]))),
                                  T.map(({ outerFinalizer }) => tuple(outerFinalizer, e.value[1]))
                                );
                              }
                            }
                          })
                        )
                      )
                    ),
                    T.map(({ tp }) => tp)
                  )
                )
              ),
              T.letS(
                "memoized",
                ({ finalizerRef, observers, promise }) =>
                  [
                    pipe(
                      promise,
                      XP.await,
                      T.onExit((e) => {
                        switch (e._tag) {
                          case "Failure": {
                            return T.unit();
                          }
                          case "Success": {
                            return pipe(
                              observers,
                              XR.update((n) => n + 1)
                            );
                          }
                        }
                      })
                    ),
                    (e: Exit<any, any>) => T.chain_(finalizerRef.get, (f) => f(e))
                  ] as readonly [T.EIO<any, any>, Finalizer]
              ),
              T.map(({ memoized, resource }) =>
                tuple(
                  resource as T.Task<readonly [R, ReleaseMap], E, readonly [Finalizer, A]>,
                  insert(layer.hash.get, memoized)(m) as ReadonlyMap<
                    PropertyKey,
                    readonly [T.EIO<any, any>, Finalizer]
                  >
                )
              )
            );
          }
        }),
        T.flatten
      )
    );
}

export const HasMemoMap = tag(MemoMap);
export type HasMemoMap = H.HasTag<typeof HasMemoMap>;

export function makeMemoMap() {
  return pipe(
    XRM.makeRefM<ReadonlyMap<PropertyKey, readonly [T.EIO<any, any>, Finalizer]>>(new Map()),
    T.chain((r) => T.total(() => new MemoMap(r)))
  );
}
