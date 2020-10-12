import * as A from "@principia/core/Array";
import * as E from "@principia/core/Either";
import type { Lazy } from "@principia/core/Function";
import { bind_, bindTo_, flow, identity, pipe, tuple } from "@principia/core/Function";
import * as I from "@principia/core/Iterable";
import * as O from "@principia/core/Option";
import { none, some } from "@principia/core/Option";
import type * as P from "@principia/prelude";
import { makeMonoid } from "@principia/prelude";

import type { Cause } from "../Cause";
import * as C from "../Cause";
import * as Ex from "../Exit/core";
import type { Exit } from "../Exit/Exit";
import type { Driver } from "../Fiber/Driver";
import type { FiberDescriptor, InterruptStatus } from "../Fiber/Fiber";
import type { FiberId } from "../Fiber/FiberId";
import type { Effect, IO, RIO, UIO, URI, V } from "./Effect";
import {
   AsyncInstruction,
   ChainInstruction,
   CheckDescriptorInstruction,
   CheckInterruptInstruction,
   FailInstruction,
   FoldInstruction,
   ForkInstruction,
   GiveInstruction,
   PureInstruction,
   ReadInstruction,
   SuspendInstruction,
   TotalInstruction
} from "./Effect";

export { Effect, IO, UIO, RIO } from "./Effect";

/*
 * -------------------------------------------
 * Core Effect Constructors
 * -------------------------------------------
 */

/**
 * ```haskell
 * pure :: Applicative f => a -> f a
 * ```
 *
 * Lifts a pure expression info an `Effect`
 *
 * @category Applicative
 * @since 1.0.0
 */
export const pure = <A>(a: A): UIO<A> => PureInstruction(a);

/**
 * ```haskell
 * succeed :: a -> Effect _ _ a
 * ```
 *
 * A synonym of `pure`
 *
 * Creates an `Effect` that has succeeded with a pure value
 *
 * @category Constructors
 * @since 1.0.0
 */
export const succeed: <E = never, A = never>(a: A) => IO<E, A> = pure;

/**
 * ```haskell
 * of :: Effect _ _ {}
 * ```
 *
 * The `Effect` that carries a success of an empty `Record`. Useful for `Do` notation.
 *
 * @category Constructors
 * @since 1.0.0
 */
export const of: Effect<unknown, never, {}> = pure({});

/**
 * ```haskell
 * async :: Effect t => (((t r e a -> ()) -> ()), ?[FiberId]) -> t r e a
 * ```
 *
 * Imports an asynchronous side-effect into an `Effect`
 *
 * @category Constructors
 * @since 1.0.0
 */
export const async = <R, E, A>(
   register: (resolve: (_: Effect<R, E, A>) => void) => void,
   blockingOn: ReadonlyArray<FiberId> = []
): Effect<R, E, A> =>
   AsyncInstruction((cb) => {
      register(cb);
      return O.none();
   }, blockingOn);

/**
 * ```haskell
 * asyncOption :: (((Effect r e a -> ()) -> Option (Effect r e a)), ?[FiberId]) -> Effect r e a
 * ```
 *
 * Imports an asynchronous effect into a pure `Effect`, possibly returning
 * the value synchronously.
 *
 * If the register function returns a value synchronously, then the callback
 * function must not be called. Otherwise the callback function must be called at most once.
 *
 * @category Constructors
 * @since 1.0.0
 */
export const asyncOption = <R, E, A>(
   register: (resolve: (_: Effect<R, E, A>) => void) => O.Option<Effect<R, E, A>>,
   blockingOn: ReadonlyArray<FiberId> = []
): Effect<R, E, A> => AsyncInstruction(register, blockingOn);

/**
 * ```haskell
 * total :: (() -> a) -> Effect _ _ a
 * ```
 *
 * Creates an `Effect` from the return value of a total function
 *
 * @category Constructors
 * @since 1.0.0
 */
export const total = <A>(thunk: () => A): UIO<A> => TotalInstruction(thunk);

/**
 * ```haskell
 * suspend :: (() -> Effect r e a) -> Effect r e a
 * ```
 *
 * Creates an lazily-constructed `Effect`, whose construction itself may require effects
 *
 * @category Constructors
 * @since 1.0.0
 */
export const suspend = <R, E, A>(factory: Lazy<Effect<R, E, A>>): Effect<R, E, A> => SuspendInstruction(factory);

/**
 * ```haskell
 * halt :: Cause e -> Effect _ e _
 * ```
 *
 * Creates an `Effect` that has failed with the specified `Cause`
 *
 * @category Constructors
 * @since 1.0.0
 */
export const halt = <E>(cause: C.Cause<E>): IO<E, never> => FailInstruction(cause);

/**
 * ```haskell
 * fail :: e -> Effect _ e _
 * ```
 *
 * Creates an `Effect` that has failed with value `e`. The moral equivalent of `throw`, except not immoral :)
 *
 * @category Constructors
 * @since 1.0.0
 */
export const fail = <E>(e: E): IO<E, never> => halt(C.fail(e));

/**
 * ```haskell
 * die :: Any -> Effect _ _ _
 * ```
 *
 * Creates an `Effect` that has died with the specified defect
 *
 * @category Constructors
 * @since 1.0.0
 */
export const die = (e: unknown): IO<never, never> => halt(C.die(e));

/**
 * ```haskell
 * done :: Exit a b -> Effect _ a b
 * ```
 *
 * Creates an `Effect` from an exit value
 *
 * @category Constructors
 * @since 1.0.0
 */
export const done = <E = never, A = unknown>(exit: Exit<E, A>) => {
   return suspend(() => {
      switch (exit._tag) {
         case "Success": {
            return pure(exit.value);
         }
         case "Failure": {
            return halt(exit.cause);
         }
      }
   });
};

export const unit: UIO<void> = pure(undefined);

export const ask = <R>(): Effect<R, never, R> => asks((_: R) => _);

/*
 * Core Effect Destructors
 */

/**
 * A more powerful version of `foldM_` that allows recovering from any kind of failure except interruptions.
 */
export const foldCauseM_ = <R, E, A, R1, E1, A1, R2, E2, A2>(
   ma: Effect<R, E, A>,
   onFailure: (cause: Cause<E>) => Effect<R1, E1, A1>,
   onSuccess: (a: A) => Effect<R2, E2, A2>
): Effect<R & R1 & R2, E1 | E2, A1 | A2> => FoldInstruction(ma, onFailure, onSuccess);

/**
 * A more powerful version of `foldM` that allows recovering from any kind of failure except interruptions.
 */
export const foldCauseM = <E, A, R1, E1, A1, R2, E2, A2>(
   onFailure: (cause: Cause<E>) => Effect<R1, E1, A1>,
   onSuccess: (a: A) => Effect<R2, E2, A2>
) => <R>(ma: Effect<R, E, A>): Effect<R & R1 & R2, E1 | E2, A1 | A2> => FoldInstruction(ma, onFailure, onSuccess);

export const foldM_ = <R, R1, R2, E, E1, E2, A, A1, A2>(
   ma: Effect<R, E, A>,
   onFailure: (e: E) => Effect<R1, E1, A1>,
   onSuccess: (a: A) => Effect<R2, E2, A2>
): Effect<R & R1 & R2, E1 | E2, A1 | A2> =>
   foldCauseM_(ma, (cause) => E.fold_(C.failureOrCause(cause), onFailure, halt), onSuccess);

export const foldM = <R1, R2, E, E1, E2, A, A1, A2>(
   onFailure: (e: E) => Effect<R1, E1, A1>,
   onSuccess: (a: A) => Effect<R2, E2, A2>
) => <R>(ma: Effect<R, E, A>): Effect<R & R1 & R2, E1 | E2, A1 | A2> => foldM_(ma, onFailure, onSuccess);

/*
 * -------------------------------------------
 * Core Effect Methods
 * -------------------------------------------
 */

/**
 * ```haskell
 * asks :: MonadEnv m => (r -> a) -> m r a
 * ```
 *
 * Accesses the environment provided to an `Effect`
 *
 * @category MonadEnv
 * @since 1.0.0
 */
export const asks = <R, A>(f: (_: R) => A): RIO<R, A> => ReadInstruction((_: R) => PureInstruction(f(_)));

/**
 * ```haskell
 * asksM :: MonadEnv m => (q -> m r a) -> m (r & q) a
 * ```
 *
 * Effectfully accesses the environment provided to an `Effect`
 *
 * @category MonadEnv
 * @since 1.0.0
 */
export const asksM = <Q, R, E, A>(f: (r: Q) => Effect<R, E, A>): Effect<R & Q, E, A> => ReadInstruction(f);

/**
 * ```haskell
 * giveAll_ :: MonadEnv m => (m r a, r) -> m _ a
 * ```
 *
 * Provides all of the environment required to compute a MonadEnv
 *
 * Provides the `Effect` with its required environment, which eliminates
 * its dependency on `R`.
 *
 * @category MonadEnv
 * @since 1.0.0
 */
export const giveAll_ = <R, E, A>(ma: Effect<R, E, A>, r: R): IO<E, A> => GiveInstruction(ma, r);

/**
 * ```haskell
 * giveAll :: MonadEnv m => r -> m r a -> m _ a
 * ```
 *
 * Provides all of the environment required to compute a MonadEnv
 *
 * Provides the `Effect` with its required environment, which eliminates
 * its dependency on `R`.
 *
 * @category MonadEnv
 * @since 1.0.0
 */
export const giveAll = <R>(r: R) => <E, A>(ma: Effect<R, E, A>): Effect<unknown, E, A> => giveAll_(ma, r);

/**
 * ```haskell
 * local_ :: MonadEnv m => (m r a, (r0 -> r)) -> m r0 a
 * ```
 *
 * Provides a portion of the environment required to compute a MonadEnv
 *
 * Provides some of the environment required to run this `Effect`,
 * leaving the remainder `R0`.
 *
 * @category MonadEnv
 * @since 1.0.0
 */
export const local_ = <R0, R, E, A>(ma: Effect<R, E, A>, f: (r0: R0) => R) => asksM((r0: R0) => giveAll_(ma, f(r0)));

/**
 * ```haskell
 * local :: MonadEnv m => (r0 -> r) -> m r a -> m r0 a
 * ```
 *
 * Provides a portion of the environment required to compute a MonadEnv
 *
 * Provides some of the environment required to run this `Effect`,
 * leaving the remainder `R0`.
 *
 * @category MonadEnv
 * @since 1.0.0
 */
export const local = <R0, R>(f: (r0: R0) => R) => <E, A>(ma: Effect<R, E, A>): Effect<R0, E, A> => local_(ma, f);

/**
 * ```haskell
 * give_ :: MonadEnv m => (m (r & r0) a, r) -> m r0 a
 * ```
 *
 * Provides a portion of the environment required to compute a MonadEnv
 *
 * Provides some of the environment required to run this effect,
 * leaving the remainder `R0` and combining it automatically using spread.
 *
 * @category MonadEnv
 * @since 1.0.0
 */
export const give_ = <E, A, R = unknown, R0 = unknown>(ma: Effect<R & R0, E, A>, r: R): Effect<R0, E, A> =>
   local_(ma, (r0) => ({ ...r0, ...r }));

/**
 * ```haskell
 * give :: MonadEnv m => r -> m (r & r0) a -> m r0 a
 * ```
 *
 * Provides a portion of the environment required to compute a MonadEnv
 *
 * Provides some of the environment required to run this `Effect`,
 * leaving the remainder `R0` and combining it automatically using spread.
 *
 * @category MonadEnv
 * @since 1.0.0
 */
export const give = <R = unknown>(r: R) => <E, A, R0 = unknown>(ma: Effect<R & R0, E, A>): Effect<R0, E, A> =>
   give_(ma, r);

/**
 * ```haskell
 * chain_ :: Monad m => (m a, (a -> m b)) -> m b
 * ```
 *
 * Composes computations in sequence, using the return value of one computation as input for the next
 *
 * Returns an effect that models the execution of this effect, followed by
 * the passing of its value to the specified continuation function `f`,
 * followed by the effect that it returns.
 *
 * @category Monad
 * @since 1.0.0
 */
export const chain_ = <R, E, A, U, G, B>(ma: Effect<R, E, A>, f: (a: A) => Effect<U, G, B>): Effect<R & U, E | G, B> =>
   ChainInstruction(ma, f);

/**
 * ```haskell
 * chain :: Monad m => (a -> m b) -> m a -> m b
 * ```
 *
 * Composes computations in sequence, using the return value of one computation as input for the next
 *
 * Returns an effect that models the execution of this effect, followed by
 * the passing of its value to the specified continuation function `f`,
 * followed by the effect that it returns.
 *
 * @category Monad
 * @since 1.0.0
 */
export const chain = <A, U, G, B>(f: (a: A) => Effect<U, G, B>) => <R, E>(
   ma: Effect<R, E, A>
): Effect<R & U, E | G, B> => chain_(ma, f);

/**
 * ```haskell
 * map_ :: Functor f => (f a, (a -> b)) -> f b
 * ```
 *
 * Lifts a function a -> b to a function f a -> f b
 *
 * Returns an `Effect` whose success is mapped by the specified function `f`.
 *
 * @category Functor
 * @since 1.0.0
 */
export const map_ = <R, E, A, B>(fa: Effect<R, E, A>, f: (a: A) => B): Effect<R, E, B> => chain_(fa, (a) => pure(f(a)));

/**
 * ```haskell
 * map :: Functor f => (a -> b) -> f a -> f b
 * ```
 *
 * Lifts a function a -> b to a function f a -> f b
 *
 * Returns an `Effect` whose success is mapped by the specified function `f`.
 *
 * @category Functor
 * @since 1.0.0
 */
export const map = <A, B>(f: (a: A) => B) => <R, E>(fa: Effect<R, E, A>): Effect<R, E, B> => map_(fa, f);

/**
 * ```haskell
 * ap_ :: Apply f => (f (a -> b), f a) -> f b
 * ```
 *
 * Apply a function to an argument under a type constructor
 *
 * @category Apply
 * @since 1.0.0
 */
export const ap_ = <Q, D, A, B, R, E>(fab: Effect<Q, D, (a: A) => B>, fa: Effect<R, E, A>): Effect<Q & R, D | E, B> =>
   chain_(fab, (ab) => map_(fa, ab));

/**
 * ```haskell
 * ap :: Apply f => f (a -> b) -> f a -> f b
 * ```
 *
 * Apply a function to an argument under a type constructor
 *
 * @category Apply
 * @since 1.0.0
 */
export const ap = <R, E, A>(fa: Effect<R, E, A>) => <Q, D, B>(
   fab: Effect<Q, D, (a: A) => B>
): Effect<Q & R, D | E, B> => ap_(fab, fa);

export const apFirst_ = <R, E, A, Q, D, B>(fa: Effect<R, E, A>, fb: Effect<Q, D, B>): Effect<Q & R, D | E, A> =>
   ap_(
      map_(fa, (a) => () => a),
      fb
   );

export const apFirst = <Q, D, B>(fb: Effect<Q, D, B>) => <R, E, A>(fa: Effect<R, E, A>): Effect<Q & R, D | E, A> =>
   apFirst_(fa, fb);

/**
 * ```haskell
 * _apSecond :: Apply f => (f a, f b) -> f b
 * ```
 *
 * Combine two effectful actions, keeping only the result of the second
 *
 * @category Apply
 * @since 1.0.0
 */
export const _apSecond = <R, E, A, Q, D, B>(fa: Effect<R, E, A>, fb: Effect<Q, D, B>): Effect<Q & R, D | E, B> =>
   ap_(
      map_(fa, () => (b: B) => b),
      fb
   );

/**
 * ```haskell
 * apSecond :: Apply f => f b -> f a -> f b
 * ```
 *
 * Combine two effectful actions, keeping only the result of the second
 *
 * @category Apply
 * @since 1.0.0
 */
export const apSecond = <Q, D, B>(fb: Effect<Q, D, B>) => <R, E, A>(fa: Effect<R, E, A>): Effect<Q & R, D | E, B> =>
   _apSecond(fa, fb);

export const mapBoth_ = <R, E, A, Q, D, B, C>(
   fa: Effect<R, E, A>,
   fb: Effect<Q, D, B>,
   f: (a: A, b: B) => C
): Effect<Q & R, D | E, C> => chain_(fa, (ra) => map_(fb, (rb) => f(ra, rb)));

export const mapBoth = <A, Q, D, B, C>(fb: Effect<Q, D, B>, f: (a: A, b: B) => C) => <R, E>(
   fa: Effect<R, E, A>
): Effect<Q & R, D | E, C> => mapBoth_(fa, fb, f);

/**
 * ```haskell
 * both_ :: Apply f => (f a, f b) -> f [a, b]
 * ```
 *
 * Tuples the arguments of two `Functors`
 *
 * Tuples the success values of two `Effects`
 *
 * @category Apply
 * @since 1.0.0
 */
export const both_ = <R, E, A, Q, D, B>(
   fa: Effect<R, E, A>,
   fb: Effect<Q, D, B>
): Effect<Q & R, D | E, readonly [A, B]> => mapBoth_(fa, fb, tuple);

/**
 * ```haskell
 * both :: Apply f => f b -> f a -> f [a, b]
 * ```
 *
 * Tuples the arguments of two `Functors`
 *
 * Tuples the success values of two `Effects`
 *
 * @category Apply
 * @since 1.0.0
 */
export const both = <Q, D, B>(fb: Effect<Q, D, B>) => <R, E, A>(
   fa: Effect<R, E, A>
): Effect<Q & R, D | E, readonly [A, B]> => both_(fa, fb);

/**
 * ```haskell
 * flatten :: Monad m => m m a -> m a
 * ```
 *
 * Removes one level of nesting from a nested `Effect`
 *
 * @category Monad
 * @since 1.0.0
 */
export const flatten: P.FlattenFn<[URI], V> = (ffa) => chain_(ffa, identity);

/**
 * ```haskell
 * tap_ :: Monad m => (ma, (a -> m b)) -> m a
 * ```
 *
 * Composes computations in sequence, using the return value of one computation as input for the next
 * and keeping only the result of the first
 *
 * Returns an effect that effectfully "peeks" at the success of this effect.
 *
 * @category Monad
 * @since 1.0.0
 */
export const tap_: P.TapFn_<[URI], V> = (fa, f) =>
   chain_(fa, (a) =>
      pipe(
         f(a),
         map(() => a)
      )
   );

/**
 * ```haskell
 * tap :: Monad m => (a -> m b) -> m a -> m a
 * ```
 *
 * Composes computations in sequence, using the return value of one computation as input for the next
 * and keeping only the result of the first
 *
 * Returns an effect that effectfully "peeks" at the success of this effect.
 *
 * @category Monad
 * @since 1.0.0
 */
export const tap: P.TapFn<[URI], V> = (f) => (fa) => tap_(fa, f);

/**
 * ```haskell
 * chainFirst :: Monad m => (a -> m b) -> m a -> m a
 * ```
 *
 * A synonym of `tap`.
 *
 * Composes computations in sequence, using the return value of one computation as input for the next
 * and keeping only the result of the first
 *
 * Returns an effect that effectfully "peeks" at the success of this effect.
 *
 * @category Monad
 * @since 1.0.0
 */
export const chainFirst: P.ChainFirstFn<[URI], V> = tap;

export const bimap_ = <R, E, A, G, B>(pab: Effect<R, E, A>, f: (e: E) => G, g: (a: A) => B): Effect<R, G, B> =>
   foldM_(
      pab,
      (e) => fail(f(e)),
      (a) => pure(g(a))
   );

export const bimap = <E, G, A, B>(f: (e: E) => G, g: (a: A) => B) => <R>(pab: Effect<R, E, A>): Effect<R, G, B> =>
   bimap_(pab, f, g);

/**
 * ```haskell
 * first_ :: Bifunctor p => (p a c, (a -> b)) -> p b c
 * ```
 *
 * Map covariantly over the first argument.
 *
 * Returns an effect with its error channel mapped using the specified
 * function. This can be used to lift a "smaller" error into a "larger"
 * error.
 *
 * @category Bifunctor
 * @since 1.0.0
 */
export const first_: P.FirstFn_<[URI], V> = (fea, f) => foldCauseM_(fea, flow(C.map(f), halt), pure);

/**
 * ```haskell
 * first :: Bifunctor p => (a -> b) -> p a c -> p b c
 * ```
 *
 * Map covariantly over the first argument.
 *
 * Returns an effect with its error channel mapped using the specified
 * function. This can be used to lift a "smaller" error into a "larger"
 * error.
 *
 * @category Bifunctor
 * @since 1.0.0
 */
export const first: P.FirstFn<[URI], V> = (f) => (fea) => first_(fea, f);

export const bindS: P.BindSFn<[URI], V> = (name, f) =>
   chain((a) =>
      pipe(
         f(a),
         map((b) => bind_(a, name, b))
      )
   );

export const bindToS: P.BindToSFn<[URI], V> = (name) => (fa) => map_(fa, bindTo_(name));

export const letS: P.LetSFn<[URI], V> = (name, f) => bindS(name, flow(f, pure));

/*
 * -------------------------------------------
 * Core Effect Combinators
 * -------------------------------------------
 */

export const catchAll_ = <R, E, A, R1, E1, A1>(
   ma: Effect<R, E, A>,
   f: (e: E) => Effect<R1, E1, A1>
): Effect<R & R1, E1, A | A1> => foldM_(ma, f, (x) => pure(x));

export const catchAll = <R, E, E2, A>(f: (e: E2) => Effect<R, E, A>) => <R2, A2>(ma: Effect<R2, E2, A2>) =>
   catchAll_(ma, f);

export const uncause = <R, E>(ma: Effect<R, never, C.Cause<E>>): Effect<R, E, void> =>
   chain_(ma, (a) => (C.isEmpty(a) ? unit : halt(a)));

/**
 * Ignores the result of the effect, replacing it with unit
 *
 * @category Combinators
 * @since 1.0.0
 */
export const asUnit = <R, E>(ma: Effect<R, E, any>) => chain_(ma, () => unit);

/**
 * ```haskell
 * as_ :: (Effect r e a, b) -> Effect r e b
 * ```
 *
 * Maps the success value of this effect to the specified constant value.
 *
 * @category Combinators
 * @since 1.0.0
 */
export const as_ = <R, E, A, B>(ma: Effect<R, E, A>, b: B) => map_(ma, () => b);

/**
 * ```haskell
 * as :: b -> Effect r e a -> Effect r e b
 * ```
 *
 * Maps the success value of this effect to the specified constant value.
 *
 * @category Combinators
 * @since 1.0.0
 */
export const as = <B>(b: B) => <R, E, A>(ma: Effect<R, E, A>) => as_(ma, b);

/**
 * ```haskell
 * asSomeError :: Effect r e a -> Effect r (Maybe e) a
 * ```
 *
 * Maps the error value of this effect to an optional value.
 *
 * @category Combinators
 * @since 1.0.0
 */
export const asSomeError: <R, E, A>(ma: Effect<R, E, A>) => Effect<R, O.Option<E>, A> = first(some);

export const cause = <R, E, A>(effect: Effect<R, E, A>): Effect<R, never, Cause<E>> =>
   foldCauseM_(effect, pure, () => pure(C.empty));

/**
 * The moral equivalent of
 * ```typescript
 * if (b) {
 *    onTrue();
 * } else {
 *    onFalse();
 * }
 * ```
 * but way more moral
 *
 * @category Combinators
 * @since 1.0.0
 */
export const ifM = <R, E>(b: Effect<R, E, boolean>) => <R1, E1, A1>(onTrue: () => Effect<R1, E1, A1>) => <R2, E2, A2>(
   onFalse: () => Effect<R2, E2, A2>
): Effect<R & R1 & R2, E | E1 | E2, A1 | A2> =>
   chain_(b, (x) => (x ? (onTrue() as Effect<R & R1 & R2, E | E1 | E2, A1 | A2>) : onFalse()));

export const fromEither = <E, A>(f: () => E.Either<E, A>) => chain_(total(f), E.fold(fail, pure));

/**
 * ```haskell
 * absolve :: Effect r e (Either e1 a) -> Effect r (e | e1) a
 * ```
 *
 * Returns an effect that submerges the error case of an `Either` into the
 * `Effect`.
 *
 * @category Combinators
 * @since 1.0.0
 */
export const absolve = <R, E, E1, A>(v: Effect<R, E, E.Either<E1, A>>) => chain_(v, (e) => fromEither(() => e));

/**
 * Applies the function `f` to each element of the `Iterable<A>` and runs
 * produced effects sequentially.
 *
 * Equivalent to `asUnit(foreach(f)(as))`, but without the cost of building
 * the list of results.
 *
 * @category Combinators
 * @since 1.0.0
 */
export const foreachUnit_ = <R, E, A>(as: Iterable<A>, f: (a: A) => Effect<R, E, any>): Effect<R, E, void> =>
   I.foldMap(makeMonoid<Effect<R, E, void>>((x, y) => chain_(x, () => y), unit))(f)(as);

/**
 * Applies the function `f` to each element of the `Iterable<A>` and runs
 * produced effects sequentially.
 *
 * Equivalent to `asUnit(foreach(f)(as))`, but without the cost of building
 * the list of results.
 *
 * @category Combinators
 * @since 1.0.0
 */
export const foreachUnit = <R, E, A>(f: (a: A) => Effect<R, E, any>) => (as: Iterable<A>): Effect<R, E, void> =>
   foreachUnit_(as, f);

/**
 * Applies the function `f` to each element of the `Iterable<A>` and
 * returns the results in a new `readonly B[]`.
 *
 * For a parallel version of this method, see `foreachPar`.
 * If you do not need the results, see `foreachUnit` for a more efficient implementation.
 *
 * @category Combinators
 * @since 1.0.0
 */
export const foreach_ = <R, E, A, B>(as: Iterable<A>, f: (a: A) => Effect<R, E, B>): Effect<R, E, ReadonlyArray<B>> =>
   I.reduce_(as, pure([]) as Effect<R, E, ReadonlyArray<B>>, (b, a) =>
      mapBoth_(
         b,
         suspend(() => f(a)),
         (acc, r) => [...acc, r]
      )
   );

/**
 * Applies the function `f` to each element of the `Iterable<A>` and
 * returns the results in a new `readonly B[]`.
 *
 * For a parallel version of this method, see `foreachPar`.
 * If you do not need the results, see `foreachUnit` for a more efficient implementation.
 *
 * @category Combinators
 * @since 1.0.0
 */
export const foreach = <R, E, A, B>(f: (a: A) => Effect<R, E, B>) => (
   as: Iterable<A>
): Effect<R, E, ReadonlyArray<B>> => foreach_(as, f);

export const result = <R, E, A>(value: Effect<R, E, A>): Effect<R, never, Exit<E, A>> =>
   FoldInstruction(
      value,
      (cause) => pure(Ex.failure(cause)),
      (succ) => pure(Ex.succeed(succ))
   );

export const foldl_ = <A, B, R, E>(as: Iterable<A>, b: B, f: (b: B, a: A) => Effect<R, E, B>): Effect<R, E, B> =>
   A.reduce_(Array.from(as), pure(b) as Effect<R, E, B>, (acc, el) => chain_(acc, (a) => f(a, el)));

export const foldl = <R, E, A, B>(b: B, f: (b: B, a: A) => Effect<R, E, B>) => (as: Iterable<A>) => foldl_(as, b, f);

export const foldr_ = <A, Z, R, E>(i: Iterable<A>, zero: Z, f: (a: A, z: Z) => Effect<R, E, Z>): Effect<R, E, Z> =>
   A.reduceRight_(Array.from(i), pure(zero) as Effect<R, E, Z>, (el, acc) => chain_(acc, (a) => f(el, a)));

export const foldr = <A, Z, R, E>(zero: Z, f: (a: A, z: Z) => Effect<R, E, Z>) => (i: Iterable<A>) =>
   foldr_(i, zero, f);

export const whenM_ = <R, E, A, R1, E1>(f: Effect<R, E, A>, b: Effect<R1, E1, boolean>) =>
   chain_(b, (a) => (a ? map_(f, some) : map_(unit, () => none())));

export const whenM = <R, E>(b: Effect<R, E, boolean>) => <R1, E1, A>(f: Effect<R1, E1, A>) => whenM_(f, b);

export const tapCause_ = <R2, A2, R, E, E2>(effect: Effect<R2, E2, A2>, f: (e: Cause<E2>) => Effect<R, E, any>) =>
   foldCauseM_(effect, (c) => chain_(f(c), () => halt(c)), pure);

export const tapCause = <R, E, E1>(f: (e: Cause<E1>) => Effect<R, E, any>) => <R1, A1>(effect: Effect<R1, E1, A1>) =>
   tapCause_(effect, f);

export const checkDescriptor = <R, E, A>(f: (d: FiberDescriptor) => Effect<R, E, A>): Effect<R, E, A> =>
   CheckDescriptorInstruction(f);

export const checkInterruptible = <R, E, A>(f: (i: InterruptStatus) => Effect<R, E, A>): Effect<R, E, A> =>
   CheckInterruptInstruction(f);

export const fork = <R, E, A>(value: Effect<R, E, A>): RIO<R, Driver<E, A>> => ForkInstruction(value, O.none());
