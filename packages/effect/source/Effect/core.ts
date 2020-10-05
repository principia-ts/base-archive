import * as A from "@principia/core/Array";
import * as E from "@principia/core/Either";
import { bind_, bindTo_, flow, identity, Lazy, pipe } from "@principia/core/Function";
import * as I from "@principia/core/Iterable";
import * as Mb from "@principia/core/Maybe";
import { just, Maybe, nothing } from "@principia/core/Maybe";
import type * as TC from "@principia/core/typeclass-index";

import type { Cause } from "../Cause";
import * as C from "../Cause";
import * as Ex from "../Exit/core";
import type { Exit } from "../Exit/Exit";
import type { FiberDescriptor, InterruptStatus } from "../Fiber/Fiber";
import type { FiberContext } from "../Fiber/FiberContext";
import type { FiberId } from "../Fiber/FiberId";
import {
   AsyncInstruction,
   ChainInstruction,
   CheckDescriptorInstruction,
   CheckInterruptInstruction,
   Effect,
   FailInstruction,
   FoldInstruction,
   ForkInstruction,
   IO,
   ProvideInstruction,
   PureInstruction,
   ReadInstruction,
   RIO,
   SuspendInstruction,
   TotalInstruction,
   UIO,
   URI,
   V
} from "./Effect";

export type { Effect, IO, RIO, UIO };

/*
 * Base Constructors
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
export const pure: TC.PureF<[URI], V> = (a) => new PureInstruction(a);

/**
 * ```haskell
 * succeed :: Effect t => a -> t _ _ _ a
 * ```
 *
 * A synonym of `pure`
 *
 * Creates an `Effect` that has succeeded with a pure value
 *
 * @category Constructors
 * @since 1.0.0
 */
export const succeed: <A, E = never>(a: A) => Effect<unknown, E, A> = pure;

/**
 * ```haskell
 * of :: Effect _ _ _ {}
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
 * async :: Effect t => (((t x r e a -> ()) -> ()), ?[FiberId]) -> t x r e a
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
   new AsyncInstruction((cb) => {
      register(cb);
      return Mb.nothing();
   }, blockingOn);

/**
 * ```haskell
 * maybeAsync :: Effect t => (((t x r e a -> () -> Maybe (t x r e a))), ?[FiberId]) -> t x r e a
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
export const maybeAsync = <R, E, A>(
   register: (resolve: (_: Effect<R, E, A>) => void) => Mb.Maybe<Effect<R, E, A>>,
   blockingOn: ReadonlyArray<FiberId> = []
): Effect<R, E, A> => new AsyncInstruction(register, blockingOn);

/**
 * ```haskell
 * total :: Effect t => (() -> a) -> t _ _ _ a
 * ```
 *
 * Creates an `Effect` from the return value of a total function
 *
 * @category Constructors
 * @since 1.0.0
 */
export const total = <A>(thunk: Lazy<A>): UIO<A> => new TotalInstruction(thunk);

/**
 * ```haskell
 * suspend :: Effect t => (() -> t x r e a) -> t x r e a
 * ```
 *
 * Creates an lazily-constructed `Effect`, whose construction itself may require effects
 *
 * @category Constructors
 * @since 1.0.0
 */
export const suspend = <R, E, A>(factory: Lazy<Effect<R, E, A>>): Effect<R, E, A> =>
   new SuspendInstruction(factory);

/**
 * ```haskell
 * halt :: (Effect t, Cause c) => c e -> t _ _ e _
 * ```
 *
 * Creates an `Effect` that has failed with the specified `Cause`
 *
 * @category Constructors
 * @since 1.0.0
 */
export const halt = <E>(cause: C.Cause<E>): IO<E, never> => new FailInstruction(cause);

/**
 * ```haskell
 * fail :: Effect t => e -> t _ _ e _
 * ```
 *
 * Creates an `Effect` that has failed with value `e`
 *
 * @category Constructors
 * @since 1.0.0
 */
export const fail = <E>(e: E): IO<E, never> => halt(C.fail(e));

/**
 * ```haskell
 * die :: Effect t => Any -> t _ _ _ _
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
 * done :: (Effect t, Exit e) => e a b -> t _ _ a b
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

/*
 * Destructors
 */

/**
 * A more powerful version of `_foldM` that allows recovering from any kind of failure except interruptions.
 */
export const _foldCauseM = <R, E, A, R1, E1, A1, R2, E2, A2>(
   ma: Effect<R, E, A>,
   onFailure: (cause: Cause<E>) => Effect<R1, E1, A1>,
   onSuccess: (a: A) => Effect<R2, E2, A2>
): Effect<R & R1 & R2, E1 | E2, A1 | A2> => new FoldInstruction(ma, onFailure, onSuccess);

/**
 * A more powerful version of `foldM` that allows recovering from any kind of failure except interruptions.
 */
export const foldCauseM = <E, A, R1, E1, A1, R2, E2, A2>(
   onFailure: (cause: Cause<E>) => Effect<R1, E1, A1>,
   onSuccess: (a: A) => Effect<R2, E2, A2>
) => <R>(ma: Effect<R, E, A>): Effect<R & R1 & R2, E1 | E2, A1 | A2> =>
   new FoldInstruction(ma, onFailure, onSuccess);

export const _foldM = <X, X1, X2, R, R1, R2, E, E1, E2, A, A1, A2>(
   ma: Effect<R, E, A>,
   onFailure: (e: E) => Effect<R1, E1, A1>,
   onSuccess: (a: A) => Effect<R2, E2, A2>
): Effect<R & R1 & R2, E1 | E2, A1 | A2> =>
   _foldCauseM(ma, (cause) => E._fold(C.failureOrCause(cause), onFailure, halt), onSuccess);

export const foldM = <R1, R2, E, E1, E2, A, A1, A2>(
   onFailure: (e: E) => Effect<R1, E1, A1>,
   onSuccess: (a: A) => Effect<R2, E2, A2>
) => <R>(ma: Effect<R, E, A>): Effect<R & R1 & R2, E1 | E2, A1 | A2> =>
   _foldM(ma, onFailure, onSuccess);

/*
 * Methods
 */

/**
 * ```haskell
 * access :: MonadEnv m => (r -> a) -> m r a
 * ```
 *
 * Accesses the environment of a MonadEnv
 *
 * Accesses the environment provided to an `Effect`
 *
 * @category MonadEnv
 * @since 1.0.0
 */
export const access: TC.AccessF<[URI], V> = <R0, A>(f: (_: R0) => A): RIO<R0, A> =>
   new ReadInstruction((_: R0) => new PureInstruction(f(_)));

/**
 * ```haskell
 * accessM :: MonadEnv m => (r0 -> m r a) -> m (r & r0) a
 * ```
 *
 * Monadically accesses the environment of a MonadEnv
 *
 * Accesses the environment provided to an `Effect`
 *
 * @category MonadEnv
 * @since 1.0.0
 */
export const accessM: TC.AccessMF<[URI], V> = (f) => new ReadInstruction(f);

/**
 * ```haskell
 * _provideAll :: MonadEnv m => (m r a, r) -> m _ a
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
export const _provideAll: TC.UC_ProvideAllF<[URI], V> = (ma, r) => new ProvideInstruction(ma, r);

/**
 * ```haskell
 * provideAll :: MonadEnv m => r -> m r a -> m _ a
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
export const provideAll: TC.ProvideAllF<[URI], V> = (r) => (ma) => _provideAll(ma, r);

/**
 * ```haskell
 * _provideSome :: MonadEnv m => (m r a, (r0 -> r)) -> m r0 a
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
export const _provideSome: TC.UC_ProvideSomeF<[URI], V> = <R0, R, E, A>(
   ma: Effect<R, E, A>,
   f: (r0: R0) => R
) => accessM((r0: R0) => _provideAll(ma, f(r0)));

/**
 * ```haskell
 * provideSome :: MonadEnv m => (r0 -> r) -> m r a -> m r0 a
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
export const provideSome: TC.ProvideSomeF<[URI], V> = (f) => (ma) => _provideSome(ma, f);

/**
 * ```haskell
 * _provide :: MonadEnv m => (m (r & r0) a, r) -> m r0 a
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
export const _provide: TC.UC_ProvideF<[URI], V> = (ma, r) =>
   _provideSome(ma, (r0) => ({ ...r0, ...r }));

/**
 * ```haskell
 * provide :: MonadEnv m => r -> m (r & r0) a -> m r0 a
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
export const provide: TC.ProvideF<[URI], V> = (r) => (ma) => _provide(ma, r);

/**
 * ```haskell
 * _chain :: Monad m => (m a, (a -> m b)) -> m b
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
export const _chain: TC.UC_ChainF<[URI], V> = (ma, f) => new ChainInstruction(ma, f);

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
export const chain: TC.ChainF<[URI], V> = (f) => (ma) => _chain(ma, f);

/**
 * ```haskell
 * bind :: Monad m => m a -> (a -> m b) -> m b
 * ```
 *
 * A version of `chain` where the arguments are interchanged
 * Composes computations in sequence, using the return value of one computation as input for the next
 *
 * Returns an effect that models the execution of this effect, followed by
 * the passing of its value to the specified continuation function `f`,
 * followed by the effect that it returns.
 *
 * @category Monad
 * @since 1.0.0
 */
export const bind: TC.BindF<[URI], V> = (ma) => (f) => _chain(ma, f);

/**
 * ```haskell
 * _map :: Functor f => (f a, (a -> b)) -> f b
 * ```
 *
 * Lifts a function a -> b to a function f a -> f b
 *
 * Returns an `Effect` whose success is mapped by the specified function `f`.
 *
 * @category Functor
 * @since 1.0.0
 */
export const _map: TC.UC_MapF<[URI], V> = (fa, f) => _chain(fa, (a) => pure(f(a)));

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
export const map: TC.MapF<[URI], V> = (f) => (fa) => _map(fa, f);

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
export const flatten: TC.FlattenF<[URI], V> = (ffa) => _chain(ffa, identity);

/**
 * ```haskell
 * _tap :: Monad m => (ma, (a -> m b)) -> m a
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
export const _tap: TC.UC_TapF<[URI], V> = (fa, f) =>
   _chain(fa, (a) =>
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
export const tap: TC.TapF<[URI], V> = (f) => (fa) => _tap(fa, f);

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
export const chainFirst: TC.ChainFirstF<[URI], V> = tap;

/**
 * ```haskell
 * _first :: Bifunctor p => (p a c, (a -> b)) -> p b c
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
export const _first: TC.UC_FirstF<[URI], V> = (fea, f) =>
   _foldCauseM(fea, flow(C.map(f), halt), pure);

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
export const first: TC.FirstF<[URI], V> = (f) => (fea) => _first(fea, f);

export const _bimap: TC.UC_BimapF<[URI], V> = (fea, f, g) =>
   _foldM(
      fea,
      (e) => fail(f(e)),
      (a) => pure(g(a))
   );

export const bimap: TC.BimapF<[URI], V> = (f, g) => (fea) => _bimap(fea, f, g);

/**
 * ```haskell
 * _ap :: Apply f => (f (a -> b), f a) -> f b
 * ```
 *
 * Apply a function to an argument under a type constructor
 *
 * @category Apply
 * @since 1.0.0
 */
export const _ap: TC.UC_ApF<[URI], V> = (fab, fa) => _chain(fab, (ab) => _map(fa, ab));

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
export const ap: TC.ApF<[URI], V> = (fa) => (fab) => _ap(fab, fa);

export const _mapBoth: TC.UC_MapBothF<[URI], V> = (fa, fb, f) =>
   _chain(fa, (ra) => _map(fb, (rb) => f(ra, rb)));

export const mapBoth: TC.MapBothF<[URI], V> = (fb, f) => (fa) => _mapBoth(fa, fb, f);

/**
 * ```haskell
 * _both :: Apply f => (f a, f b) -> f [a, b]
 * ```
 *
 * Tuples the arguments of two `Functors`
 *
 * Tuples the success values of two `Effects`
 *
 * @category Apply
 * @since 1.0.0
 */
export const _both: TC.UC_BothF<[URI], V> = (fa, fb) => _mapBoth(fa, fb, (a, b) => [a, b]);

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
export const both: TC.BothF<[URI], V> = (fb) => (fa) => _both(fa, fb);

/**
 * ```haskell
 * mapN :: Apply f => ([a, b, ...] -> c) -> [f a, f b, ...] -> f c
 * ```
 *
 * Combines a tuple of `Effects` and if all are successes, maps with provided function `f`
 *
 * @category Apply
 * @since 1.0.0
 */
export const mapN: TC.MapNF<[URI], V> = (f) =>
   flow(
      foreach(identity),
      map((a) => f(a as any))
   );

/**
 * ```haskell
 * tuple :: Apply f => [f a, f b, ...] -> f [a, b, ...]
 * ```
 *
 * Combines a tuple of `Effects` and if all are successes, returns a succeeded `Effect` of all arguments as a tuple
 *
 * @category Apply
 * @since 1.0.0
 */
export const tuple: TC.TupleF<[URI], V> = (fas) => _foreach(fas, identity) as any;

/**
 * ```haskell
 * _extend :: Extend w => (w a, (w a -> b)) -> w b
 * ```
 */
export const _extend: TC.UC_ExtendF<[URI], V> = (wa, f) =>
   _foldM(
      wa,
      (e) => fail(e),
      (_) => pure(f(wa))
   );

/**
 * ```haskell
 * extend :: Extend w => (w a -> b) -> w a -> w b
 * ```
 */
export const extend: TC.ExtendF<[URI], V> = (f) => (wa) => _extend(wa, f);

/**
 * ```haskell
 * duplicate :: Extend w => w a -> w w a
 * ```
 */
export const duplicate = <R, E, A>(wa: Effect<R, E, A>): Effect<R, E, Effect<R, E, A>> =>
   _extend(wa, identity);

/**
 * ```haskell
 * swap :: Bifunctor p => p a b -> p b a
 * ```
 *
 * Swaps the positions of a Bifunctor's arguments
 *
 * @category AltBifunctor
 * @since 1.0.0
 */
export const swap: TC.SwapF<[URI], V> = (pab) => _foldM(pab, pure, fail);

export const bindS: TC.BindSF<[URI], V> = (name, f) =>
   chain((a) =>
      pipe(
         f(a),
         map((b) => bind_(a, name, b))
      )
   );

export const bindToS: TC.BindToSF<[URI], V> = (name) => (fa) => _map(fa, bindTo_(name));

export const letS: TC.LetSF<[URI], V> = (name, f) =>
   chain((a) =>
      pipe(
         f(a),
         pure,
         map((b) => bind_(a, name, b))
      )
   );

/*
 * Additional Constructors
 */

export const unit: UIO<void> = pure(undefined);

export const environment = <R>(): Effect<R, never, R> => access((_: R) => _);

export const uncause = <R, E, A>(ma: Effect<R, never, C.Cause<E>>): Effect<R, E, void> =>
   _chain(ma, (a) => (C.isEmpty(a) ? unit : halt(a)));

/*
 * Combinators
 */

export const asUnit = <R, E>(ma: Effect<R, E, any>) => _chain(ma, () => unit);

export const _as = <R, E, A, B>(ma: Effect<R, E, A>, b: B) => _map(ma, () => b);

export const as = <B>(b: B) => <R, E, A>(ma: Effect<R, E, A>) => _as(ma, b);

export const asJustError: <R, E, A>(ma: Effect<R, E, A>) => Effect<R, Maybe<E>, A> = first(just);

export const cause = <R, E, A>(effect: Effect<R, E, A>): Effect<R, never, Cause<E>> =>
   _foldCauseM(effect, pure, () => pure(C.empty));

export const ifM = <R, E>(b: Effect<R, E, boolean>) => <R1, E1, A1>(
   onTrue: () => Effect<R1, E1, A1>
) => <X2, R2, E2, A2>(
   onFalse: () => Effect<R2, E2, A2>
): Effect<R & R1 & R2, E | E1 | E2, A1 | A2> =>
   _chain(b, (x) => (x ? (onTrue() as Effect<R & R1 & R2, E | E1 | E2, A1 | A2>) : onFalse()));

export const _foldl = <A, B, R, E>(
   as: Iterable<A>,
   b: B,
   f: (b: B, a: A) => Effect<R, E, B>
): Effect<R, E, B> =>
   A._reduce(Array.from(as), pure(b) as Effect<R, E, B>, (acc, el) => _chain(acc, (a) => f(a, el)));

export const foldl = <R, E, A, B>(b: B, f: (b: B, a: A) => Effect<R, E, B>) => (as: Iterable<A>) =>
   _foldl(as, b, f);

export const _foldr = <A, Z, R, E>(
   i: Iterable<A>,
   zero: Z,
   f: (a: A, z: Z) => Effect<R, E, Z>
): Effect<R, E, Z> =>
   A._reduceRight(Array.from(i), pure(zero) as Effect<R, E, Z>, (el, acc) =>
      _chain(acc, (a) => f(el, a))
   );

export const foldr = <A, Z, R, E>(zero: Z, f: (a: A, z: Z) => Effect<R, E, Z>) => (
   i: Iterable<A>
) => _foldr(i, zero, f);

export const _apFirst: TC.UC_ApFirstF<[URI], V> = <R, R1, E, E1, A, A1>(
   a: Effect<R, E, A>,
   b: Effect<R1, E1, A1>
): Effect<R & R1, E | E1, A> => _chain(a, (a) => _map(b, () => a));

export const apFirst: TC.ApFirstF<[URI], V> = (fb) => (fa) => _apFirst(fa, fb);

export const fromEither = <E, A>(f: () => E.Either<E, A>) => _chain(total(f), E.fold(fail, pure));

export const absolve = <R, E, E1, A>(v: Effect<R, E, E.Either<E1, A>>) =>
   _chain(v, (e) => fromEither(() => e));

export const _foreachUnit = <R, E, A>(
   as: Iterable<A>,
   f: (a: A) => Effect<R, E, any>
): Effect<R, E, void> =>
   I.foldMap<Effect<R, E, void>>({
      empty: unit,
      concat: (x) => (y) => _chain(x, () => y)
   })(f)(as);

export const foreachUnit = <R, E, A>(f: (a: A) => Effect<R, E, any>) => (
   as: Iterable<A>
): Effect<R, E, void> => _foreachUnit(as, f);

export const _foreach = <R, E, A, B>(
   as: Iterable<A>,
   f: (a: A) => Effect<R, E, B>
): Effect<R, E, ReadonlyArray<B>> =>
   I.reduce_(as, pure([]) as Effect<R, E, ReadonlyArray<B>>, (b, a) =>
      _mapBoth(
         b,
         suspend(() => f(a)),
         (acc, r) => [...acc, r]
      )
   );

export const foreach = <R, E, A, B>(f: (a: A) => Effect<R, E, B>) => (
   as: Iterable<A>
): Effect<R, E, ReadonlyArray<B>> => _foreach(as, f);

export const result = <R, E, A>(value: Effect<R, E, A>): Effect<R, never, Exit<E, A>> =>
   new FoldInstruction(
      value,
      (cause) => pure(Ex.failure(cause)),
      (succ) => pure(Ex.succeed(succ))
   );

export const either = <R, E, A>(self: Effect<R, E, A>): Effect<R, never, E.Either<E, A>> =>
   _foldM(
      self,
      (e) => pure(E.left(e)),
      (a) => pure(E.right(a))
   );

export const _catchAll = <R, E, A, R1, E1, A1>(
   ma: Effect<R, E, A>,
   f: (e: E) => Effect<R1, E1, A1>
): Effect<R & R1, E1, A | A1> => _foldM(ma, f, (x) => pure(x));

export const catchAll = <R, E, E2, A>(f: (e: E2) => Effect<R, E, A>) => <S2, R2, A2>(
   ma: Effect<R2, E2, A2>
) => _catchAll(ma, f);

export const _tryOrElse = <R, E, A, R1, E1, A1, R2, E2, A2>(
   ma: Effect<R, E, A>,
   that: () => Effect<R1, E1, A1>,
   onSuccess: (a: A) => Effect<R2, E2, A2>
): Effect<R & R1 & R2, E1 | E2, A1 | A2> =>
   new FoldInstruction(ma, (cause) => Mb._fold(C.keepDefects(cause), that, halt), onSuccess);

export const tryOrElse = <A, R1, E1, A1, R2, E2, A2>(
   that: () => Effect<R1, E1, A1>,
   onSuccess: (a: A) => Effect<R2, E2, A2>
) => <R, E>(ma: Effect<R, E, A>): Effect<R & R1 & R2, E1 | E2, A1 | A2> =>
   _tryOrElse(ma, that, onSuccess);

export const _orElse = <R, E, A, R1, E1, A1>(
   ma: Effect<R, E, A>,
   that: () => Effect<R1, E1, A1>
): Effect<R & R1, E1, A | A1> => _tryOrElse(ma, that, pure);

export const orElse = <R1, E1, A1>(that: () => Effect<R1, E1, A1>) => <R, E, A>(
   ma: Effect<R, E, A>
): Effect<R & R1, E1, A | A1> => _tryOrElse(ma, that, pure);

export const _orElseEither = <R, E, A, R1, E1, A1>(
   self: Effect<R, E, A>,
   that: Effect<R1, E1, A1>
): Effect<R & R1, E1, E.Either<A, A1>> =>
   _tryOrElse(
      self,
      () => _map(that, E.right),
      (a) => new PureInstruction(E.left(a))
   );

export const orElseEither = <R1, E1, A1>(that: Effect<R1, E1, A1>) => <R, E, A>(
   ma: Effect<R, E, A>
) => _orElseEither(ma, that);

export const _orElseFail = <R, E, A, E1>(ma: Effect<R, E, A>, e: E1): Effect<R, E1, A> =>
   _orElse(ma, () => fail(e));

export const _orElseMaybe = <R, E, A, R1, E1, A1>(
   ma: Effect<R, Maybe<E>, A>,
   that: () => Effect<R1, Maybe<E1>, A1>
): Effect<R & R1, Maybe<E | E1>, A | A1> =>
   _catchAll(
      ma,
      Mb.fold(that, (e) => fail(just<E | E1>(e)))
   );

export const orElseMaybe = <R1, E1, A1>(that: () => Effect<R1, Maybe<E1>, A1>) => <R, E, A>(
   ma: Effect<R, Maybe<E>, A>
) => _orElseMaybe(ma, that);

export const _orElseSucceed = <R, E, A, A1>(ma: Effect<R, E, A>, a: A1): Effect<R, E, A | A1> =>
   _orElse(ma, () => pure(a));

export const orElseSucceed = <A1>(a: A1) => <R, E, A>(self: Effect<R, E, A>) =>
   _orElseSucceed(self, a);

export const _orDieWith = <R, E, A>(
   ma: Effect<R, E, A>,
   f: (e: E) => unknown
): Effect<R, never, A> => _foldM(ma, (e) => die(f(e)), pure);

export const orDieWith = <E>(f: (e: E) => unknown) => <R, A>(
   ma: Effect<R, E, A>
): Effect<R, never, A> => _orDieWith(ma, f);

export const orDie = <R, E, A>(ma: Effect<R, E, A>): Effect<R, never, A> =>
   _orDieWith(ma, identity);

export const orDieKeep = <R, E, A>(ma: Effect<R, E, A>): Effect<R, unknown, A> =>
   _foldCauseM(ma, (ce) => halt(C._chain(ce, (e) => C.die(e))), pure);

export const _whenM = <R, E, A, R1, E1>(f: Effect<R, E, A>, b: Effect<R1, E1, boolean>) =>
   _chain(b, (a) => (a ? _map(f, just) : _map(unit, () => nothing())));

export const whenM = <R, E>(b: Effect<R, E, boolean>) => <R1, E1, A>(f: Effect<R1, E1, A>) =>
   _whenM(f, b);

export const _tapCause = <R2, A2, R, E, E2>(
   effect: Effect<R2, E2, A2>,
   f: (e: Cause<E2>) => Effect<R, E, any>
) => _foldCauseM(effect, (c) => _chain(f(c), () => halt(c)), pure);

export const tapCause = <R, E, E1>(f: (e: Cause<E1>) => Effect<R, E, any>) => <R1, A1>(
   effect: Effect<R1, E1, A1>
) => _tapCause(effect, f);

export const _summarized = <R, E, A, R1, E1, B, C>(
   self: Effect<R, E, A>,
   summary: Effect<R1, E1, B>,
   f: (start: B, end: B) => C
): Effect<R & R1, E | E1, [C, A]> =>
   pipe(
      of,
      bindS("start", () => summary),
      bindS("value", () => self),
      bindS("end", () => summary),
      map((s) => [f(s.start, s.end), s.value])
   );

export const summarized = <R1, E1, B, C>(
   summary: Effect<R1, E1, B>,
   f: (start: B, end: B) => C
) => <R, E, A>(self: Effect<R, E, A>): Effect<R & R1, E | E1, [C, A]> =>
   _summarized(self, summary, f);

export const checkDescriptor = <R, E, A>(
   f: (d: FiberDescriptor) => Effect<R, E, A>
): Effect<R, E, A> => new CheckDescriptorInstruction(f);

export const checkInterruptible = <R, E, A>(
   f: (i: InterruptStatus) => Effect<R, E, A>
): Effect<R, E, A> => new CheckInterruptInstruction(f);

export const fork = <R, E, A>(value: Effect<R, E, A>): RIO<R, FiberContext<E, A>> =>
   new ForkInstruction(value, Mb.nothing());
