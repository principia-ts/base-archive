import { pipe, tuple } from "@principia/core/Function";

import { Cause } from "../Cause";
import { ExecutionStrategy, parallel, parallelN, sequential } from "../ExecutionStrategy";
import type { Exit } from "../Exit";
import * as Ex from "../Exit";
import { FiberContext } from "../Fiber/FiberContext";
import { interrupt } from "../Fiber/functions/interrupt";
import { makeRef } from "../XRef/combinators";
import * as T from "./_internal/effect";
import type { Managed } from "./Managed";
import {
   add,
   addIfOpen,
   Finalizer,
   makeReleaseMap,
   noopFinalizer,
   release,
   releaseAll,
   ReleaseMap
} from "./ReleaseMap";

export type { Managed, UIO, RIO, IO, URI, V } from "./Managed";

export const managed = <R, E, A>(
   effect: T.Effect<readonly [R, ReleaseMap], E, readonly [Finalizer, A]>
): Managed<R, E, A> =>
   ({
      effect
   } as Managed<R, E, A>);

/**
 * Lifts a `Effect<R, E, A>` into `Managed<R, E, A>` with no release action. The
 * effect will be performed interruptibly.
 */
export const fromEffect = <R, E, A>(effect: T.Effect<R, E, A>) =>
   managed<R, E, A>(
      T._map(
         T.accessM((_: readonly [R, ReleaseMap]) => T._provideAll(effect, _[0])),
         (a) => [noopFinalizer, a]
      )
   );

/**
 * Returns a managed that models the execution of this managed, followed by
 * the passing of its value to the specified continuation function `f`,
 * followed by the managed that it returns.
 */
export const chain = <R1, E1, A, A1>(f: (a: A) => Managed<R1, E1, A1>) => <R, E>(
   self: Managed<R, E, A>
) => _chain(self, f);

/**
 * Returns a managed that models the execution of this managed, followed by
 * the passing of its value to the specified continuation function `f`,
 * followed by the managed that it returns.
 */
export const _chain = <R, E, A, R1, E1, A1>(
   self: Managed<R, E, A>,
   f: (a: A) => Managed<R1, E1, A1>
) =>
   managed<R & R1, E | E1, A1>(
      T._chain(self.effect, ([releaseSelf, a]) =>
         T._map(f(a).effect, ([releaseThat, b]) => [
            (e) =>
               T._chain(T.result(releaseThat(e)), (e1) =>
                  T._chain(T.result(releaseSelf(e1)), (e2) => T.done(Ex._apSecond(e1, e2)))
               ),
            b
         ])
      )
   );

/**
 * Imports a synchronous side-effect into a pure value
 */
export const total = <A>(effect: () => A) => fromEffect(T.total(effect));

/**
 * Returns an effect that models failure with the specified error. The moral equivalent of throw for pure code.
 */
export const fail = <E>(e: E) => fromEffect(T.fail(e));

/**
 * Creates an effect that executes a finalizer stored in a `Ref`.
 * The `Ref` is yielded as the result of the effect, allowing for
 * control flows that require mutating finalizers.
 */
export const finalizerRef = (initial: Finalizer) =>
   _makeExit(makeRef(initial), (ref, exit) => T._chain(ref.get, (f) => f(exit)));

/**
 * A more powerful version of `foldM` that allows recovering from any kind of failure except interruptions.
 */
export const foldCauseM = <E, A, R1, E1, A1, R2, E2, A2>(
   f: (cause: Cause<E>) => Managed<R1, E1, A1>,
   g: (a: A) => Managed<R2, E2, A2>
) => <R>(self: Managed<R, E, A>) => _foldCauseM(self, f, g);

/**
 * A more powerful version of `foldM` that allows recovering from any kind of failure except interruptions.
 */
export const _foldCauseM = <R, E, A, R1, E1, A1, R2, E2, A2>(
   self: Managed<R, E, A>,
   f: (cause: Cause<E>) => Managed<R1, E1, A1>,
   g: (a: A) => Managed<R2, E2, A2>
) =>
   managed<R & R1 & R2, E1 | E2, A1 | A2>(
      pipe(
         self.effect,
         T.foldCauseM(
            (c) => f(c).effect,
            ([_, a]) => g(a).effect
         )
      )
   );

/**
 * Applies the function `f` to each element of the `Iterable<A>` and
 * returns the results in a new `B[]`.
 *
 * For a parallel version of this method, see `foreachPar`.
 * If you do not need the results, see `foreachUnit` for a more efficient implementation.
 */
export const foreach = <R, E, A, B>(f: (a: A) => Managed<R, E, B>) => (as: Iterable<A>) =>
   _foreach(as, f);

/**
 * Applies the function `f` to each element of the `Iterable<A>` and
 * returns the results in a new `B[]`.
 *
 * For a parallel version of this method, see `foreachPar_`.
 * If you do not need the results, see `foreachUnit_` for a more efficient implementation.
 */
export const _foreach = <R, E, A, B>(as: Iterable<A>, f: (a: A) => Managed<R, E, B>) =>
   managed<R, E, readonly B[]>(
      T._map(
         T._foreach(as, (a) => f(a).effect),
         (res) => {
            const fins = res.map((k) => k[0]);
            const as = res.map((k) => k[1]);

            return [(e) => T._foreach(fins.reverse(), (fin) => fin(e)), as];
         }
      )
   );

/**
 * Lifts a `Effect<S, R, E, A>` into `Managed<S, R, E, A>` with a release action.
 * The acquire and release actions will be performed uninterruptibly.
 */
export const make = <R1, A>(
   release: (a: A) => T.Effect<R1, never, unknown>
): (<R, E>(acquire: T.Effect<R, E, A>) => Managed<R & R1, E, A>) => makeExit((a) => release(a));

/**
 * Lifts a `Effect<S, R, E, A>` into `Managed<S, R, E, A>` with a release action.
 * The acquire and release actions will be performed uninterruptibly.
 */
export const _make = <R, E, A, R1>(
   acquire: T.Effect<R, E, A>,
   release: (a: A) => T.Effect<R1, never, unknown>
): Managed<R & R1, E, A> => _makeExit(acquire, (a) => release(a));

/**
 * Lifts a `Effect<S, R, E, A>` into `Managed<S, R, E, A>` with a release action
 * that handles `Exit`. The acquire and release actions will be performed uninterruptibly.
 */
export const makeExit = <R1, A>(
   release: (a: A, exit: Exit<any, any>) => T.Effect<R1, never, unknown>
) => <R, E>(acquire: T.Effect<R, E, A>) => _makeExit(acquire, release);

/**
 * Lifts a `Effect<S, R, E, A>` into `Managed<S, R, E, A>` with a release action
 * that handles `Exit`. The acquire and release actions will be performed uninterruptibly.
 */
export const _makeExit = <R, E, A, R1>(
   acquire: T.Effect<R, E, A>,
   release: (a: A, exit: Exit<any, any>) => T.Effect<R1, never, unknown>
) =>
   managed<R & R1, E, A>(
      T.makeUninterruptible(
         pipe(
            T.of,
            T.bindS("r", () => T.environment<readonly [R & R1, ReleaseMap]>()),
            T.bindS("a", (s) => T._provideAll(acquire, s.r[0])),
            T.bindS("rm", (s) => add((ex) => T._provideAll(release(s.a, ex), s.r[0]))(s.r[1])),
            T.map((s) => [s.rm, s.a])
         )
      )
   );

/**
 * Creates a `Managed` from a `Reservation` produced by an effect. Evaluating
 * the effect that produces the reservation will be performed *uninterruptibly*,
 * while the acquisition step of the reservation will be performed *interruptibly*.
 * The release step will be performed uninterruptibly as usual.
 *
 * This two-phase acquisition allows for resource acquisition flows that can be
 * safely interrupted and released.
 */
export const makeReserve = <R, E, X2, R2, E2, A>(
   reservation: T.Effect<R, E, Reservation<R2, E2, A>>
) =>
   managed<R & R2, E | E2, A>(
      T.uninterruptibleMask(({ restore }) =>
         pipe(
            T.of,
            T.bindS("tp", () => T.environment<readonly [R & R2, ReleaseMap]>()),
            T.letS("r", (s) => s.tp[0]),
            T.letS("releaseMap", (s) => s.tp[1]),
            T.bindS("reserved", (s) => T._provideAll(reservation, s.r)),
            T.bindS("releaseKey", (s) =>
               addIfOpen((x) => T._provideAll(s.reserved.release(x), s.r))(s.releaseMap)
            ),
            T.bindS("finalizerAndA", (s) => {
               const k = s.releaseKey;
               switch (k._tag) {
                  case "Nothing": {
                     return T.interrupt;
                  }
                  case "Just": {
                     return T._map(
                        restore(
                           T._provideSome(
                              s.reserved.acquire,
                              ([r]: readonly [R & R2, ReleaseMap]) => r
                           )
                        ),
                        (a): [Finalizer, A] => [(e) => release(k.value, e)(s.releaseMap), a]
                     );
                  }
               }
            }),
            T.map((s) => s.finalizerAndA)
         )
      )
   );

/**
 * Returns a managed whose success is mapped by the specified `f` function.
 */
export const map = <A, B>(f: (a: A) => B) => <R, E>(self: Managed<R, E, A>) => _map(self, f);

/**
 * Returns a managed whose success is mapped by the specified `f` function.
 */
export const _map = <R, E, A, B>(self: Managed<R, E, A>, f: (a: A) => B) =>
   managed<R, E, B>(T._map(self.effect, ([fin, a]) => [fin, f(a)]));

/**
 * Returns a managed whose success is mapped by the specified `f` function.
 */
export const _mapEffect = <R, E, A, R1, E1, B>(
   self: Managed<R, E, A>,
   f: (a: A) => T.Effect<R1, E1, B>
) =>
   managed<R & R1, E | E1, B>(
      T._chain(self.effect, ([fin, a]) =>
         T._provideSome(
            T._map(f(a), (b) => [fin, b]),
            ([r]: readonly [R & R1, ReleaseMap]) => r
         )
      )
   );

/**
 * Returns a managed whose success is mapped by the specified `f` function.
 */
export const mapEffect = <R1, E1, A, B>(f: (a: A) => T.Effect<R1, E1, B>) => <R, E>(
   self: Managed<R, E, A>
) =>
   managed<R & R1, E | E1, B>(
      T._chain(self.effect, ([fin, a]) =>
         T._provideSome(
            T._map(f(a), (b) => [fin, b]),
            ([r]: readonly [R & R1, ReleaseMap]) => r
         )
      )
   );

/**
 * Like provideSome_ for effect but for Managed
 */
export const _provideSome = <R, E, A, R0>(
   self: Managed<R, E, A>,
   f: (r0: R0) => R
): Managed<R0, E, A> =>
   managed(
      T.accessM(([r0, rm]: readonly [R0, ReleaseMap]) => T._provideAll(self.effect, [f(r0), rm]))
   );

/**
 * A `Reservation<R, E, A>` encapsulates resource acquisition and disposal
 * without specifying when or how that resource might be used.
 */
export class Reservation<R, E, A> {
   static of = <R, E, A, X2, R2>(
      acquire: T.Effect<R, E, A>,
      release: (exit: Exit<any, any>) => T.Effect<R2, never, any>
   ) => new Reservation<R & R2, E, A>(acquire, release);

   private constructor(
      readonly acquire: T.Effect<R, E, A>,
      readonly release: (exit: Exit<any, any>) => T.Effect<R, never, any>
   ) {}
}

/**
 * Make a new reservation
 */
export const _makeReservation = <R, E, A, X2, R2>(
   acquire: T.Effect<R, E, A>,
   release: (exit: Exit<any, any>) => T.Effect<R2, never, any>
) => Reservation.of(acquire, release);

/**
 * Make a new reservation
 */
export const makeReservation = <R2>(
   release: (exit: Exit<any, any>) => T.Effect<R2, never, any>
) => <R, E, A>(acquire: T.Effect<R, E, A>) => Reservation.of(acquire, release);

/**
 * Lifts a pure `Reservation<S, R, E, A>` into `Managed<S, R, E, A>`. The acquisition step
 * is performed interruptibly.
 */
export const reserve = <R, E, A>(reservation: Reservation<R, E, A>) =>
   makeReserve(T.pure(reservation));

/**
 * Lift a pure value into an effect
 */
export const succeed = <A>(a: A) => fromEffect(T.pure(a));

/**
 * Returns a managed that effectfully peeks at the acquired resource.
 */
export const tap = <R1, E1, A>(f: (a: A) => Managed<R1, E1, any>) => <R, E>(
   self: Managed<R, E, A>
) => _chain(self, (a) => _map(f(a), () => a));

/**
 * Returns a managed that executes both this managed and the specified managed,
 * in sequence, combining their results with the specified `f` function.
 */
export const _both = <R, E, A, R1, E1, A1>(self: Managed<R, E, A>, that: Managed<R1, E1, A1>) =>
   _mapBoth(self, that, (a, a2) => [a, a2] as [A, A1]);

/**
 * Returns a managed that executes both this managed and the specified managed,
 * in sequence, combining their results with the specified `f` function.
 */
export const both = <R1, E1, A1>(that: Managed<R1, E1, A1>) => <R, E, A>(self: Managed<R, E, A>) =>
   _mapBoth(self, that, (a, a2) => [a, a2] as [A, A1]);

/**
 * Returns a managed that executes both this managed and the specified managed,
 * in sequence, combining their results with the specified `f` function.
 */
export const mapBoth = <A, B, R1, E1, A1>(that: Managed<R1, E1, A1>, f: (a: A, a2: A1) => B) => <
   R,
   E
>(
   self: Managed<R, E, A>
) => _mapBoth(self, that, f);

/**
 * Returns a managed that executes both this managed and the specified managed,
 * in sequence, combining their results with the specified `f` function.
 */
export const _mapBoth = <R, E, A, R1, E1, A1, B>(
   self: Managed<R, E, A>,
   that: Managed<R1, E1, A1>,
   f: (a: A, a2: A1) => B
) => _chain(self, (a) => _map(that, (a2) => f(a, a2)));

/**
 * Run an effect while acquiring the resource before and releasing it after
 */
export const use = <A, R2, E2, B>(f: (a: A) => T.Effect<R2, E2, B>) => <R, E>(
   self: Managed<R, E, A>
): T.Effect<R & R2, E | E2, B> => use_(self, f);

/**
 * Run an effect while acquiring the resource before and releasing it after
 */
export const use_ = <R, E, A, R2, E2, B>(
   self: Managed<R, E, A>,
   f: (a: A) => T.Effect<R2, E2, B>
): T.Effect<R & R2, E | E2, B> => {
   return T._bracketExit(
      makeReleaseMap,
      (rm) =>
         T._chain(
            T._provideSome(self.effect, (r: R) => tuple(r, rm)),
            (a) => f(a[1])
         ),
      (rm, ex) => releaseAll(ex, sequential())(rm)
   );
};

/**
 * Creates a `Managed` value that acquires the original resource in a fiber,
 * and provides that fiber. The finalizer for this value will interrupt the fiber
 * and run the original finalizer.
 */
export const fork = <R, E, A>(self: Managed<R, E, A>): Managed<R, never, FiberContext<E, A>> =>
   managed(
      T.uninterruptibleMask(({ restore }) =>
         pipe(
            T.of,
            T.bindS("tp", () => T.environment<readonly [R, ReleaseMap]>()),
            T.letS("r", ({ tp }) => tp[0]),
            T.letS("outerReleaseMap", ({ tp }) => tp[1]),
            T.bindS("innerReleaseMap", () => makeReleaseMap),
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
               add((e) =>
                  pipe(
                     fiber,
                     interrupt,
                     T.chain(() => releaseAll(e, sequential())(innerReleaseMap))
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
export const makeManagedReleaseMap = (es: ExecutionStrategy): Managed<unknown, never, ReleaseMap> =>
   _makeExit(makeReleaseMap, (rm, e) => releaseAll(e, es)(rm));

/**
 * Applies the function `f` to each element of the `Iterable<A>` in parallel,
 * and returns the results in a new `B[]`.
 *
 * For a sequential version of this method, see `foreach`.
 */
export const foreachPar = <R, E, A, B>(f: (a: A) => Managed<R, E, B>) => (
   as: Iterable<A>
): Managed<R, E, readonly B[]> => _foreachPar(as, f);

/**
 * Applies the function `f` to each element of the `Iterable<A>` in parallel,
 * and returns the results in a new `B[]`.
 *
 * For a sequential version of this method, see `foreach_`.
 */
export const _foreachPar = <R, E, A, B>(
   as: Iterable<A>,
   f: (a: A) => Managed<R, E, B>
): Managed<R, E, readonly B[]> =>
   _mapEffect(makeManagedReleaseMap(parallel()), (parallelReleaseMap) => {
      const makeInnerMap = T._provideSome(
         T._map(makeManagedReleaseMap(sequential()).effect, ([_, x]) => x),
         (x: unknown) => tuple(x, parallelReleaseMap)
      );

      return T._foreachPar(as, (a) =>
         T._map(
            T._chain(makeInnerMap, (innerMap) =>
               T._provideSome(f(a).effect, (u: R) => tuple(u, innerMap))
            ),
            ([_, b]) => b
         )
      );
   });

/**
 * Applies the function `f` to each element of the `Iterable<A>` in parallel,
 * and returns the results in a new `B[]`.
 *
 * Unlike `foreachPar`, this method will use at most up to `n` fibers.
 */
export const foreachParN = (n: number) => <R, E, A, B>(f: (a: A) => Managed<R, E, B>) => (
   as: Iterable<A>
): Managed<R, E, readonly B[]> => _foreachParN(n)(as, f);

/**
 * Applies the function `f` to each element of the `Iterable<A>` in parallel,
 * and returns the results in a new `B[]`.
 *
 * Unlike `foreachPar_`, this method will use at most up to `n` fibers.
 */
export const _foreachParN = (n: number) => <R, E, A, B>(
   as: Iterable<A>,
   f: (a: A) => Managed<R, E, B>
): Managed<R, E, readonly B[]> =>
   _mapEffect(makeManagedReleaseMap(parallelN(n)), (parallelReleaseMap) => {
      const makeInnerMap = T._provideSome(
         T._map(makeManagedReleaseMap(sequential()).effect, ([_, x]) => x),
         (x: unknown) => tuple(x, parallelReleaseMap)
      );

      return T._foreachParN(n)(as, (a) =>
         T._map(
            T._chain(makeInnerMap, (innerMap) =>
               T._provideSome(f(a).effect, (u: R) => tuple(u, innerMap))
            ),
            ([_, b]) => b
         )
      );
   });

/**
 * Returns a managed that executes both this managed and the specified managed,
 * in parallel, combining their results with the specified `f` function.
 */
export const mapBothPar = <A, R1, E1, A1, B>(that: Managed<R1, E1, A1>, f: (a: A, a2: A1) => B) => <
   R,
   E
>(
   self: Managed<R, E, A>
): Managed<R & R1, E | E1, B> => _mapBothPar(self, that, f);

/**
 * Returns a managed that executes both this managed and the specified managed,
 * in parallel, combining their results with the specified `f` function.
 */
export const _mapBothPar = <R, E, A, R1, E1, A1, B>(
   self: Managed<R, E, A>,
   that: Managed<R1, E1, A1>,
   f: (a: A, a2: A1) => B
): Managed<R & R1, E | E1, B> =>
   _mapEffect(makeManagedReleaseMap(parallel()), (parallelReleaseMap) => {
      const innerMap = T._provideSome(makeManagedReleaseMap(sequential()).effect, (r: R & R1) =>
         tuple(r, parallelReleaseMap)
      );

      return T._chain(T._both(innerMap, innerMap), ([[_, l], [__, r]]) =>
         T._bothMapPar(
            T._provideSome(self.effect, (_: R & R1) => tuple(_, l)),
            T._provideSome(that.effect, (_: R & R1) => tuple(_, r)),
            ([_, a], [__, a2]) => f(a, a2)
         )
      );
   });

/**
 * Ensures that a cleanup function runs when this ZManaged is finalized, after
 * the existing finalizers.
 */
export const onExit_ = <R, E, A, R1>(
   self: Managed<R, E, A>,
   cleanup: (exit: Ex.Exit<E, A>) => T.Effect<R1, never, any>
) =>
   managed<R & R1, E, A>(
      T.uninterruptibleMask(({ restore }) =>
         pipe(
            T.of,
            T.bindS("tp", () => T.environment<readonly [R & R1, ReleaseMap]>()),
            T.letS("r", (s) => s.tp[0]),
            T.letS("outerReleaseMap", (s) => s.tp[1]),
            T.bindS("innerReleaseMap", () => makeReleaseMap),
            T.bindS("exitEA", (s) =>
               restore(
                  T._provideAll(T.result(T._map(self.effect, ([_, a]) => a)), [
                     s.r,
                     s.innerReleaseMap
                  ])
               )
            ),
            T.bindS("releaseMapEntry", (s) =>
               add((e) =>
                  pipe(
                     releaseAll(e, sequential())(s.innerReleaseMap),
                     T.result,
                     T.mapBoth(pipe(cleanup(s.exitEA), T.provideAll(s.r), T.result), (l, r) =>
                        Ex._apSecond(l, r)
                     )
                  )
               )(s.outerReleaseMap)
            ),
            T.bindS("a", (s) => T.done(s.exitEA)),
            T.map((s) => [s.releaseMapEntry, s.a])
         )
      )
   );

/**
 * Ensures that a cleanup function runs when this ZManaged is finalized, after
 * the existing finalizers.
 */
export const onExit = <E, A, R1>(cleanup: (exit: Ex.Exit<E, A>) => T.Effect<R1, never, any>) => <R>(
   self: Managed<R, E, A>
) => onExit_(self, cleanup);

/**
 * Ensures that a cleanup function runs when this ZManaged is finalized, before
 * the existing finalizers.
 */
export const onExitFirst = <E, A, R1>(
   cleanup: (exit: Ex.Exit<E, A>) => T.Effect<R1, never, any>
) => <R>(self: Managed<R, E, A>) => _onExitFirst(self, cleanup);

/**
 * Ensures that a cleanup function runs when this ZManaged is finalized, before
 * the existing finalizers.
 */
export const _onExitFirst = <R, E, A, R1>(
   self: Managed<R, E, A>,
   cleanup: (exit: Ex.Exit<E, A>) => T.Effect<R1, never, any>
) =>
   managed<R & R1, E, A>(
      T.uninterruptibleMask(({ restore }) =>
         pipe(
            T.of,
            T.bindS("tp", () => T.environment<readonly [R & R1, ReleaseMap]>()),
            T.letS("r", (s) => s.tp[0]),
            T.letS("outerReleaseMap", (s) => s.tp[1]),
            T.bindS("innerReleaseMap", () => makeReleaseMap),
            T.bindS("exitEA", (s) =>
               restore(
                  T._provideAll(T.result(T._map(self.effect, ([_, a]) => a)), [
                     s.r,
                     s.innerReleaseMap
                  ])
               )
            ),
            T.bindS("releaseMapEntry", (s) =>
               add((e) =>
                  T.flatten(
                     T._mapBoth(
                        T.result(T._provideAll(cleanup(s.exitEA), s.r)),
                        T.result(releaseAll(e, sequential())(s.innerReleaseMap)),
                        (l, r) => T.done(Ex._apSecond(l, r))
                     )
                  )
               )(s.outerReleaseMap)
            ),
            T.bindS("a", (s) => T.done(s.exitEA)),
            T.map((s) => [s.releaseMapEntry, s.a])
         )
      )
   );

/**
 * Runs the acquire and release actions and returns the result of this
 * managed effect. Note that this is only safe if the result of this managed
 * effect is valid outside its scope.
 */
export const useNow = <R, E, A>(self: Managed<R, E, A>) => use_(self, T.pure);

/**
 * Lifts a `Effect<R, E, A>` into `Managed<R, E, A>` with a release action.
 * The acquire action will be performed interruptibly, while release
 * will be performed uninterruptibly.
 */
export const makeInterruptible = <A, R1>(release: (a: A) => T.Effect<R1, never, unknown>) => <
   S,
   R,
   E
>(
   acquire: T.Effect<R, E, A>
) => _onExitFirst(fromEffect(acquire), Ex.foreach(release));

/**
 * Lifts a `Effect<R, E, A>` into `Managed<R, E, A>` with a release action.
 * The acquire action will be performed interruptibly, while release
 * will be performed uninterruptibly.
 */
export const _makeInterruptible = <R, E, A, R1>(
   acquire: T.Effect<R, E, A>,
   release: (a: A) => T.Effect<R1, never, unknown>
) =>
   _onExitFirst(fromEffect(acquire), (e) => {
      switch (e._tag) {
         case "Failure": {
            return T.unit;
         }
         case "Success": {
            return release(e.value);
         }
      }
   });

/**
 * Ensures that `f` is executed when this Managed is finalized, after
 * the existing finalizer.
 *
 * For usecases that need access to the Managed's result, see [[onExit]].
 */
export const _ensuring = <R, E, A, R1>(self: Managed<R, E, A>, f: T.Effect<R1, never, any>) =>
   onExit_(self, () => f);

/**
 * Ensures that `f` is executed when this Managed is finalized, after
 * the existing finalizer.
 *
 * For usecases that need access to the Managed's result, see [[onExit]].
 */
export const ensuring = <R1>(f: T.Effect<R1, never, any>) => <R, E, A>(self: Managed<R, E, A>) =>
   _ensuring(self, f);

export const of = succeed({});
