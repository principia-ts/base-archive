import * as A from "@principia/core/Array";
import { flow, pipe, tuple } from "@principia/core/Function";
import * as Mb from "@principia/core/Maybe";

import * as C from "../Cause";
import { ExecutionStrategy, sequential } from "../ExecutionStrategy";
import * as Ex from "../Exit/core";
import { Exit } from "../Exit/Exit";
import { Fiber } from "../Fiber/Fiber";
import type { FiberContext } from "../Fiber/FiberContext";
import { interrupt } from "../Fiber/functions/interrupt";
import * as M from "../Managed/core";
import type { Managed } from "../Managed/Managed";
import * as RM from "../Managed/ReleaseMap";
import * as Sema from "../Semaphore";
import { fail as promiseFail } from "../XPromise/functions/fail";
import { make as promiseMake } from "../XPromise/functions/make";
import { succeed as promiseSucceed } from "../XPromise/functions/succeed";
import { wait as promiseWait } from "../XPromise/functions/wait";
import * as XR from "../XRef/combinators";
import * as T from "./_internal/effect";

export function releaseAllReleaseMaps(
   exit: Exit<any, any>,
   execStrategy: ExecutionStrategy
): (_: RM.ReleaseMap) => T.UIO<any> {
   return (_: RM.ReleaseMap) =>
      pipe(
         _.ref,
         XR.modify((s): [T.UIO<any>, RM.ManagedState] => {
            switch (s._tag) {
               case "Exited": {
                  return [T.unit, s];
               }
               case "Running": {
                  switch (execStrategy._tag) {
                     case "Sequential": {
                        return [
                           T._chain(
                              T._foreach(Array.from(RM.finalizers(s)).reverse(), ([_, f]) =>
                                 T.result(f(exit))
                              ),
                              (e) =>
                                 T.done(Mb._getOrElse(Ex.collectAll(...e), () => Ex.succeed([])))
                           ),
                           RM.exited(s.nextKey, exit)
                        ];
                     }
                     case "Parallel": {
                        return [
                           T._chain(
                              _foreachPar(Array.from(RM.finalizers(s)).reverse(), ([_, f]) =>
                                 T.result(f(exit))
                              ),
                              (e) =>
                                 T.done(Mb._getOrElse(Ex.collectAllPar(...e), () => Ex.succeed([])))
                           ),
                           RM.exited(s.nextKey, exit)
                        ];
                     }
                     case "ParallelN": {
                        return [
                           T._chain(
                              _foreachParN(execStrategy.n)(
                                 Array.from(RM.finalizers(s)).reverse(),
                                 ([_, f]) => T.result(f(exit))
                              ),
                              (e) =>
                                 T.done(Mb._getOrElse(Ex.collectAllPar(...e), () => Ex.succeed([])))
                           ),
                           RM.exited(s.nextKey, exit)
                        ];
                     }
                  }
               }
            }
         }),
         T.flatten
      );
}

/**
 * Applies the function `f` to each element of the `Iterable<A>` and runs
 * produced effects in parallel, discarding the results.
 *
 * For a sequential version of this method, see `foreach_`.
 *
 * Optimized to avoid keeping full tree of effects, so that method could be
 * able to handle large input sequences.
 * Behaves almost like this code:
 *
 * Additionally, interrupts all effects on any failure.
 */
export function _foreachUnitPar<R, E, A>(
   as: Iterable<A>,
   f: (a: A) => T.Effect<R, E, any>
): T.Effect<R, E, void> {
   const arr = Array.from(as);
   const size = arr.length;

   if (size === 0) {
      return T.unit;
   }

   return pipe(
      T.of,
      T.bindS("parentId", () => T.checkFiberId()),
      T.bindS("causes", () => XR.makeRef<C.Cause<E>>(C.empty)),
      T.bindS("result", () => promiseMake<void, void>()),
      T.bindS("status", () => XR.makeRef([0, 0, false] as [number, number, boolean])),
      T.letS("startTask", (s) =>
         pipe(
            s.status,
            XR.modify(([started, done, failing]): [boolean, [number, number, boolean]] =>
               failing ? [false, [started, done, failing]] : [true, [started + 1, done, failing]]
            )
         )
      ),
      T.letS("startFailure", (s) =>
         pipe(
            s.status,
            XR.update(([started, done, _]): [number, number, boolean] => [started, done, true]),
            T.tap(() => promiseFail<void>(undefined)(s.result))
         )
      ),
      T.letS("task", (s) => (a: A) =>
         T.makeUninterruptible(
            T.whenM(s.startTask)(
               pipe(
                  T.suspend(() => f(a)),
                  T.makeInterruptible,
                  T.tapCause((c) =>
                     pipe(
                        s.causes,
                        XR.update((l) => C.both(l, c)),
                        T.chain(() => s.startFailure)
                     )
                  ),
                  T.ensuring(
                     T.whenM(
                        pipe(
                           s.status,
                           XR.modify(([started, done, failing]) => [
                              (failing ? started : size) === done + 1,
                              [started, done + 1, failing] as [number, number, boolean]
                           ])
                        )
                     )(promiseSucceed<void>(undefined)(s.result))
                  )
               )
            )
         )
      ),
      T.bindS("fibers", (s) => T._foreach(arr, (a) => T.fork(s.task(a)))),
      T.letS("interruptor", (s) =>
         pipe(
            s.result,
            promiseWait,
            T.catchAll(() =>
               T._chain(
                  T._foreach(s.fibers, (f) => T.fork(f.interruptAs(s.parentId))),
                  joinAllFibers
               )
            ),
            T.toManaged(),
            forkManaged
         )
      ),
      T.tap((s) =>
         _useManaged(s.interruptor, () =>
            T._onInterruptExtended(
               T.whenM(
                  T._map(
                     T._foreach(s.fibers, (f) => f.await),
                     flow(
                        A.findr((e) => e._tag === "Failure"),
                        (m) => m._tag === "Just"
                     )
                  )
               )(
                  T._chain(promiseFail<void>(undefined)(s.result), () =>
                     T._chain(s.causes.get, (x) => T.halt(x))
                  )
               ),
               () =>
                  T._chain(promiseFail<void>(undefined)(s.result), () =>
                     T._chain(
                        T._foreach(s.fibers, (f) => f.await),
                        () => T._chain(s.causes.get, (x) => T.halt(x))
                     )
                  )
            )
         )
      ),
      T.asUnit
   );
}

/**
 * Applies the function `f` to each element of the `Iterable<A>` and runs
 * produced effects in parallel, discarding the results.
 *
 * For a sequential version of this method, see `foreach_`.
 *
 * Optimized to avoid keeping full tree of effects, so that method could be
 * able to handle large input sequences.
 * Behaves almost like this code:
 *
 * Additionally, interrupts all effects on any failure.
 */
export const foreachUnitPar = <R, E, A>(f: (a: A) => T.Effect<R, E, any>) => (
   as: Iterable<A>
): T.Effect<R, E, void> => _foreachUnitPar(as, f);

/**
 * Applies the function `f` to each element of the `Iterable<A>` in parallel,
 * and returns the results in a new `readonly B[]`.
 *
 * For a sequential version of this method, see `foreach`.
 */
export const _foreachPar = <R, E, A, B>(
   as: Iterable<A>,
   f: (a: A) => T.Effect<R, E, B>
): T.Effect<R, E, ReadonlyArray<B>> => {
   const arr = Array.from(as);

   return T._chain(
      T.total<B[]>(() => []),
      (array) => {
         const fn = ([a, n]: [A, number]) =>
            T._chain(
               T.suspend(() => f(a)),
               (b) =>
                  T.total(() => {
                     array[n] = b;
                  })
            );
         return T._chain(
            _foreachUnitPar(
               arr.map((a, n) => [a, n] as [A, number]),
               fn
            ),
            () => T.total(() => array)
         );
      }
   );
};

export const foreachPar = <R, E, A, B>(f: (a: A) => T.Effect<R, E, B>) => (
   as: Iterable<A>
): T.Effect<R, E, ReadonlyArray<B>> => _foreachPar(as, f);

/**
 * Applies the functionw `f` to each element of the `Iterable<A>` in parallel,
 * and returns the results in a new `readonly B[]`.
 *
 * Unlike `foreachPar`, this method will use at most up to `n` fibers.
 */
export const _foreachParN = (n: number) => <A, R, E, B>(
   as: Iterable<A>,
   f: (a: A) => T.Effect<R, E, B>
): T.Effect<R, E, ReadonlyArray<B>> =>
   pipe(
      Sema.makeSemaphore(n),
      T.chain((s) => _foreachPar(as, (a) => Sema.withPermit(s)(f(a))))
   );

export const foreachParN = (n: number) => <X, R, E, A, B>(f: (a: A) => T.Effect<R, E, B>) => (
   as: Iterable<A>
): T.Effect<R, E, ReadonlyArray<B>> => _foreachParN(n)(as, f);

/**
 * Run an effect while acquiring the resource before and releasing it after
 */
export const useManaged = <A, R2, E2, B>(f: (a: A) => T.Effect<R2, E2, B>) => <R, E>(
   self: Managed<R, E, A>
): T.Effect<R & R2, E | E2, B> => _useManaged(self, f);

/**
 * Run an effect while acquiring the resource before and releasing it after
 */
export const _useManaged = <R, E, A, R2, E2, B>(
   self: Managed<R, E, A>,
   f: (a: A) => T.Effect<R2, E2, B>
): T.Effect<R & R2, E | E2, B> => {
   return T._bracketExit(
      RM.makeReleaseMap,
      (rm) =>
         T._chain(
            T._provideSome(self.effect, (r: R) => tuple(r, rm)),
            (a) => f(a[1])
         ),
      (rm, ex) => releaseAllReleaseMaps(ex, sequential())(rm)
   );
};

/**
 * Creates a `Managed` value that acquires the original resource in a fiber,
 * and provides that fiber. The finalizer for this value will interrupt the fiber
 * and run the original finalizer.
 */
export const forkManaged = <R, E, A>(
   self: Managed<R, E, A>
): Managed<R, never, FiberContext<E, A>> =>
   M.managed(
      T.uninterruptibleMask(({ restore }) =>
         pipe(
            T.of,
            T.bindS("tp", () => T.environment<readonly [R, RM.ReleaseMap]>()),
            T.letS("r", ({ tp }) => tp[0]),
            T.letS("outerReleaseMap", ({ tp }) => tp[1]),
            T.bindS("innerReleaseMap", () => RM.makeReleaseMap),
            T.bindS("fiber", ({ innerReleaseMap, r }) =>
               restore(
                  pipe(
                     self.effect,
                     T.map(([_, a]) => a),
                     T.forkDaemon,
                     T.provideAll([r, innerReleaseMap] as const)
                  )
               )
            ),
            T.bindS("releaseMapEntry", ({ fiber, innerReleaseMap, outerReleaseMap }) =>
               RM.add((e) =>
                  pipe(
                     fiber,
                     interrupt,
                     T.chain(() => releaseAllReleaseMaps(e, sequential())(innerReleaseMap))
                  )
               )(outerReleaseMap)
            ),
            T.map(({ fiber, releaseMapEntry }) => [releaseMapEntry, fiber])
         )
      )
   );

/**
 * Construct a `ReleaseMap` wrapped in a `Managed`. The `ReleaseMap` will
 * be released with the specified `ExecutionStrategy` as the release action
 * for the resulting `Managed`.
 */
export const makeManagedReleaseMap = (
   es: ExecutionStrategy
): Managed<unknown, never, RM.ReleaseMap> =>
   M._makeExit(RM.makeReleaseMap, (rm, e) => releaseAllReleaseMaps(e, es)(rm));

/**
 * Joins all fibers, awaiting their _successful_ completion.
 * Attempting to join a fiber that has erred will result in
 * a catchable error, _if_ that error does not result from interruption.
 */
export const joinAllFibers = <E, A>(as: Iterable<Fiber<E, A>>) =>
   T._tap(T._chain(awaitAllFibers(as), T.done), () => T._foreach(as, (f) => f.inheritRefs));

/**
 * Awaits on all fibers to be completed, successfully or not.
 */
export const awaitAllFibers = <E, A>(
   as: Iterable<Fiber<E, A>>
): T.Effect<unknown, never, Exit<E, ReadonlyArray<A>>> =>
   T.result(_foreachPar(as, (f) => T._chain(f.await, T.done)));
