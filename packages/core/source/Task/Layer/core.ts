import type { Erase } from "@principia/prelude/Utils";

import * as A from "../../Array";
import { pipe, tuple } from "../../Function";
import type * as H from "../../Has";
import { mergeEnvironments, tag } from "../../Has";
import { insert } from "../../Map";
import { sequential } from "../ExecutionStrategy";
import type { Cause } from "../Exit/Cause";
import type { Exit } from "../Exit/model";
import type { Managed } from "../Managed/model";
import type { Finalizer, ReleaseMap } from "../Managed/ReleaseMap";
import * as RelMap from "../Managed/ReleaseMap";
import * as XP from "../XPromise";
import * as XR from "../XRef";
import * as XRM from "../XRefM";
import * as M from "./_internal/managed";
import * as T from "./_internal/task";
import type { Layer, MergeA, MergeE, MergeR } from "./model";
import {
   LayerAllParInstruction,
   LayerAllSeqInstruction,
   LayerFoldInstruction,
   LayerInstructionTag,
   LayerManagedInstruction,
   LayerMapBothParInstruction,
   LayerMapBothSeqInstruction
} from "./model";

export * from "./model";

export type RIO<R, A> = Layer<R, never, A>;

export const _build = <R, E, A>(layer: Layer<R, E, A>): Managed<unknown, never, (_: MemoMap) => Managed<R, E, A>> => {
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
         return M.succeed((memo) => M.chain_(memo.getOrElseMemoize(I.layer), (a) => memo.getOrElseMemoize(I.f(a))));
      }
      case LayerInstructionTag.MapBothPar: {
         return M.succeed((memo) => M.mapBothPar_(memo.getOrElseMemoize(I.layer), memo.getOrElseMemoize(I.that), I.f));
      }
      case LayerInstructionTag.MapBothSeq: {
         return M.succeed((memo) => M.mapBoth_(memo.getOrElseMemoize(I.layer), memo.getOrElseMemoize(I.that), I.f));
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
                     M.chain((r) => M.provideSome_(memo.getOrElseMemoize(I.onFailure), () => tuple(r, e)))
                  ),
               (r) =>
                  M.provideSome_(memo.getOrElseMemoize(I.onSuccess), (x) =>
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
};

export const build = <R, E, A>(_: Layer<R, E, A>): M.Managed<R, E, A> =>
   pipe(
      M.do,
      M.bindS("memoMap", () => M.fromTask(makeMemoMap())),
      M.bindS("run", () => _build(_)),
      M.bindS("value", ({ memoMap, run }) => run(memoMap)),
      M.map(({ value }) => value)
   );

export const pure = <T>(has: H.Tag<T>) => (resource: T) =>
   new LayerManagedInstruction(M.chain_(M.fromTask(T.pure(resource)), (a) => environmentFor(has, a)));

export const prepare = <T>(has: H.Tag<T>) => <R, E, A extends T>(acquire: T.Task<R, E, A>) => ({
   open: <R1, E1>(open: (_: A) => T.Task<R1, E1, any>) => ({
      release: <R2>(release: (_: A) => T.Task<R2, never, any>) =>
         fromManaged(has)(
            M.chain_(
               M.makeExit_(acquire, (a) => release(a)),
               (a) => M.fromTask(T.map_(open(a), () => a))
            )
         )
   }),
   release: <R2>(release: (_: A) => T.Task<R2, never, any>) => fromManaged(has)(M.makeExit_(acquire, (a) => release(a)))
});

export const create = <T>(has: H.Tag<T>) => ({
   fromTask: fromTask(has),
   fromManaged: fromManaged(has),
   pure: pure(has),
   prepare: prepare(has)
});

export const fromTask = <T>(has: H.Tag<T>) => <R, E>(resource: T.Task<R, E, T>) =>
   new LayerManagedInstruction(M.chain_(M.fromTask(resource), (a) => environmentFor(has, a)));

export const fromManaged = <T>(has: H.Tag<T>) => <R, E>(resource: Managed<R, E, T>): Layer<R, E, H.Has<T>> =>
   new LayerManagedInstruction(M.chain_(resource, (a) => environmentFor(has, a)));

export const fromRawManaged = <R, E, A>(resource: Managed<R, E, A>): Layer<R, E, A> =>
   new LayerManagedInstruction(resource);

export const fromRawTask = <R, E, A>(resource: T.Task<R, E, A>): Layer<R, E, A> =>
   new LayerManagedInstruction(M.fromTask(resource));

export const fromRawFunction = <A, B>(f: (a: A) => B) => fromRawTask(T.asks(f));

export const fromRawFunctionM = <A, R, E, B>(f: (a: A) => T.Task<R, E, B>) => fromRawTask(T.asksM(f));

export const both_ = <R, E, A, R2, E2, A2>(
   left: Layer<R, E, A>,
   right: Layer<R2, E2, A2>
): Layer<R & R2, E | E2, readonly [A, A2]> => new LayerMapBothSeqInstruction(left, right, tuple);

export const both = <R2, E2, A2>(right: Layer<R2, E2, A2>) => <R, E, A>(left: Layer<R, E, A>) => both_(left, right);

export const and_ = <R, E, A, R2, E2, A2>(
   left: Layer<R, E, A>,
   right: Layer<R2, E2, A2>
): Layer<R & R2, E | E2, A & A2> => new LayerMapBothParInstruction(left, right, (l, r) => ({ ...l, ...r }));

export const and = <R2, E2, A2>(right: Layer<R2, E2, A2>) => <R, E, A>(left: Layer<R, E, A>) => and_(left, right);

export const fold_ = <R, E, A, E1, B, R2, E2, C>(
   layer: Layer<R, E, A>,
   onFailure: Layer<readonly [R, Cause<E>], E1, B>,
   onSuccess: Layer<A & R2, E2, C>
): Layer<R & R2, E1 | E2, B | C> => new LayerFoldInstruction<R, E, A, E1, B, R2, E2, C>(layer, onFailure, onSuccess);

export const andTo: {
   <R1, E1, A1>(right: Layer<R1, E1, A1>, noErase: "no-erase"): <R, E, A>(
      left: Layer<R & A1, E, A>
   ) => Layer<R & R1, E | E1, A & A1>;
   <R1, E1, A1>(right: Layer<R1, E1, A1>): <R, E, A>(left: Layer<R, E, A>) => Layer<Erase<R, A1> & R1, E | E1, A & A1>;
} = <R2, E2, A2>(right: Layer<R2, E2, A2>) => <R, E, A>(left: Layer<R, E, A>) =>
   andTo_<R, E, A, R2, E2, A2>(left, right);

export const andTo_: {
   <R, E, A, R1, E1, A1>(left: Layer<R, E, A>, right: Layer<R1, E1, A1>, noErase: "no-erase"): Layer<
      R & R1,
      E | E1,
      A & A1
   >;
   <R, E, A, R1, E1, A1>(left: Layer<R, E, A>, right: Layer<R1, E1, A1>): Layer<Erase<R, A1> & R1, E | E1, A & A1>;
} = <R, E, A, R2, E2, A2>(left: Layer<R, E, A>, right: Layer<R2, E2, A2>): Layer<Erase<R, A2> & R2, E | E2, A & A2> =>
   fold_<Erase<R, A2> & R2, E2, A2, E2, never, Erase<R, A2> & R2, E | E2, A2 & A>(
      right,
      fromRawFunctionM((_: readonly [R & R2, Cause<E2>]) => T.halt(_[1])),
      and_(right, left)
   );

export const to = <R, E, A>(to: Layer<R, E, A>) => <R2, E2, A2>(layer: Layer<R2, E2, A2>) => to_(layer, to);

export const to_ = <R, E, A, R2, E2, A2>(
   layer: Layer<R2, E2, A2>,
   to: Layer<R, E, A>
): Layer<Erase<R, A2> & R2, E | E2, A> =>
   fold_<Erase<R, A2> & R2, E2, A2, E2, never, Erase<R, A2> & R2, E | E2, A>(
      layer,
      fromRawFunctionM((_: readonly [R & R2, Cause<E2>]) => T.halt(_[1])),
      to
   );

export const andSeq_ = <R, E, A, R1, E1, A1>(
   layer: Layer<R, E, A>,
   that: Layer<R1, E1, A1>
): Layer<R & R1, E | E1, A & A1> => new LayerMapBothSeqInstruction(layer, that, (l, r) => ({ ...l, ...r }));

export const andSeq = <R1, E1, A1>(that: Layer<R1, E1, A1>) => <R, E, A>(layer: Layer<R, E, A>) => andSeq_(layer, that);

export const all = <Ls extends Layer<any, any, any>[]>(
   ...ls: Ls & { 0: Layer<any, any, any> }
): Layer<MergeR<Ls>, MergeE<Ls>, MergeA<Ls>> => new LayerAllParInstruction(ls);

export const allPar = <Ls extends Layer<any, any, any>[]>(
   ...ls: Ls & { 0: Layer<any, any, any> }
): Layer<MergeR<Ls>, MergeE<Ls>, MergeA<Ls>> => new LayerAllSeqInstruction(ls);

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
   constructor(readonly ref: XRM.RefM<ReadonlyMap<PropertyKey, readonly [T.EIO<any, any>, Finalizer]>>) {}

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
                              T.bindS("innerReleaseMap", () => RelMap.makeReleaseMap),
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
                                                         M.releaseAll(e, sequential())(innerReleaseMap) as T.EIO<E, any>
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
                                                         )(M.releaseAll(e, sequential())(innerReleaseMap) as T.IO<any>)
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
