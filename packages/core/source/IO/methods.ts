import * as A from "../Array";
import { bind_, bindTo_, flow, identity, pipe } from "../Function";
import type * as TC from "../typeclass-index";
import type { IO, URI, V } from "./IO";
import { InferA } from "./IO";

/*
 * -------------------------------------------
 * IO Methods
 * -------------------------------------------
 */

/**
 * ```haskell
 * pure :: Applicative f => a -> f a
 * ```
 *
 * Lifts a pure expression info an `IO`
 *
 * @category Applicative
 * @since 1.0.0
 */
export const pure = <A>(a: A): IO<A> => () => a;

/**
 * ```haskell
 * any :: () -> IO ()
 * ```
 */
export const unit = (): IO<void> => () => undefined;

/**
 * ```haskell
 * map_ :: Functor f => (f a, (a -> b)) -> f b
 * ```
 *
 * Lifts a function a -> b to a function f a -> f b
 *
 * @category Functor
 * @since 1.0.0
 */
export const map_ = <A, B>(fa: IO<A>, f: (a: A) => B): IO<B> => () => f(fa());

/**
 * ```haskell
 * map :: Functor f => (a -> b) -> f a -> f b
 * ```
 *
 * Lifts a function a -> b to a function f a -> f b
 *
 * @category Functor
 * @since 1.0.0
 */
export const map = <A, B>(f: (a: A) => B) => (fa: IO<A>): IO<B> => map_(fa, f);

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
export const ap_ = <A, B>(fab: IO<(a: A) => B>, fa: IO<A>): IO<B> => () => fab()(fa());

/**
 * ```haskell
 * ap :: Apply f => f a -> f (a -> b) -> f b
 * ```
 *
 * Apply a function to an argument under a type constructor
 *
 * @category Apply
 * @since 1.0.0
 */
export const ap = <A>(fa: IO<A>) => <B>(fab: IO<(a: A) => B>): IO<B> => ap_(fab, fa);

/**
 * ```haskell
 * apFirst_ :: Apply f => (f a, f b) -> f a
 * ```
 *
 * Combine two effectful actions, keeping only the result of the first
 *
 * @category Apply
 * @since 1.0.0
 */
export const apFirst_ = <A, B>(fa: IO<A>, fb: IO<B>): IO<A> =>
   pipe(
      fa,
      map((a) => () => a),
      ap(fb)
   );

/**
 * ```haskell
 * apFirst :: Apply f => f b -> f a -> f a
 * ```
 *
 * Combine two effectful actions, keeping only the result of the first
 *
 * @category Apply
 * @since 1.0.0
 */
export const apFirst = <B>(fb: IO<B>) => <A>(fa: IO<A>): IO<A> => apFirst_(fa, fb);

/**
 * ```haskell
 * apSecond_ :: Apply f => (f a, f b) -> f b
 * ```
 *
 * Combine two effectful actions, keeping only the result of the second
 *
 * @category Apply
 * @since 1.0.0
 */
export const apSecond_ = <A, B>(fa: IO<A>, fb: IO<B>): IO<B> =>
   pipe(
      fa,
      map(() => (b: B) => b),
      ap(fb)
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
export const apSecond = <B>(fb: IO<B>) => <A>(fa: IO<A>): IO<B> => apSecond_(fa, fb);

/**
 * ```haskell
 * both_ :: Apply f => (f a, f b) -> f (a, b)
 * ```
 *
 * Applies both `IO`s and collects their results into a tuple
 *
 * @category Apply
 * @since 1.0.0
 */
export const both_ = <A, B>(fa: IO<A>, fb: IO<B>): IO<readonly [A, B]> => () => [fa(), fb()];

/**
 * ```haskell
 * both :: Apply f => f b -> f a -> f (a, b)
 * ```
 *
 * Applies both `IO`s and collects their results into a tuple
 *
 * @category Apply
 * @since 1.0.0
 */
export const both = <B>(fb: IO<B>) => <A>(fa: IO<A>): IO<readonly [A, B]> => both_(fa, fb);

/**
 * ```haskell
 * mapBoth_ :: Apply f => (f a, f b, ((a, b) -> c)) -> f c
 * ```
 *
 * Applies both `IO`s and maps their results with function `f`
 *
 * @category Apply
 * @since 1.0.0
 */
export const mapBoth_ = <A, B, C>(fa: IO<A>, fb: IO<B>, f: (a: A, b: B) => C): IO<C> => () => f(fa(), fb());

/**
 * ```haskell
 * mapBoth :: Apply f => (f b, ((a, b) -> c)) -> f a -> f c
 * ```
 *
 * Applies both `IO`s and maps their results with function `f`
 *
 * @category Apply
 * @since 1.0.0
 */
export const mapBoth = <A, B, C>(fb: IO<B>, f: (a: A, b: B) => C) => (fa: IO<A>): IO<C> => mapBoth_(fa, fb, f);

/**
 * ```haskell
 * lift2 :: Apply f => (a -> b -> c) -> f a -> f b -> f c
 * ```
 *
 * Lifts a binary function to actions
 *
 * @category Apply
 * @since 1.0.0
 */
export const lift2 = <A, B, C>(f: (a: A) => (b: B) => C) => (fa: IO<A>) => (fb: IO<B>): IO<C> => () => f(fa())(fb());

/**
 * ```haskell
 * mapN :: Apply f => ([a, b, ...] -> c) -> [f a, f b, ...] -> f c
 * ```
 *
 * Combines a tuple of `IO`s and maps with provided function `f`
 *
 * @category Apply
 * @since 1.0.0
 */
export const mapN: TC.MapNF<[URI], V> = (f) => (fas) => () =>
   f(A.reduce_(fas, [] as ReadonlyArray<any>, (b, a) => [...b, a()]) as any);

/**
 * ```haskell
 * tuple :: Apply f => [f a, f b, ...] -> f [a, b, ...]
 * ```
 *
 * Combines a tuple of `IO`s and returns an `IO` of all arguments as a tuple
 *
 * @category Apply
 * @since 1.0.0
 */
export const tuple: TC.TupleF<[URI], V> = mapN(identity);

/**
 * ```haskell
 * apS :: (Apply f, Nominal n) =>
 *    (n n3, f c)
 *    -> f ({ n1: a, n2: b, ... })
 *    -> f ({ n1: a, n2: b, n3: c })
 * ```
 *
 * A pipeable version of `sequenceS`
 *
 * @category Apply
 * @since 1.0.0
 */
export const apS = <N extends string, A, B>(
   name: Exclude<N, keyof A>,
   fb: IO<B>
): (<E>(fa: IO<A>) => IO<{ [K in keyof A | N]: K extends keyof A ? A[K] : B }>) =>
   flow(
      map((a) => (b: B) => bind_(a, name, b)),
      ap(fb)
   );

/**
 * ```haskell
 * chain_ :: Monad m => (m a, (a -> m b)) -> m b
 * ```
 *
 * Composes computations in sequence, using the return value of one computation as input for the next
 *
 * @category Monad
 * @since 1.0.0
 */
export const chain_ = <A, B>(ma: IO<A>, f: (a: A) => IO<B>): IO<B> => () => f(ma())();

/**
 * ```haskell
 * chain :: Monad m => (a -> m b) -> m a -> m b
 * ```
 *
 * Composes computations in sequence, using the return value of one computation as input for the next
 *
 * @category Monad
 * @since 1.0.0
 */
export const chain = <A, B>(f: (a: A) => IO<B>) => (ma: IO<A>): IO<B> => chain_(ma, f);

/**
 * ```haskell
 * bind :: Monad m => m a -> (a -> m b) -> m b
 * ```
 *
 * A version of `chain` where the arguments are flipped
 * Composes computations in sequence, using the return value of one computation as input for the next
 *
 * @category Monad
 * @since 1.0.0
 */
export const bind = <A>(ma: IO<A>) => <B>(f: (a: A) => IO<B>): IO<B> => chain_(ma, f);

/**
 * ```haskell
 * tap_ :: Monad m => (ma, (a -> m b)) -> m a
 * ```
 *
 * Composes computations in sequence, using the return value of one computation as input for the next
 * and keeping only the result of the first
 *
 * @category Monad
 * @since 1.0.0
 */
export const tap_ = <A, B>(ma: IO<A>, f: (a: A) => IO<B>): IO<A> => chain_(ma, (a) => map_(f(a), () => a));

/**
 * ```haskell
 * tap :: Monad m => (a -> m b) -> ma -> m a
 * ```
 *
 * Composes computations in sequence, using the return value of one computation as input for the next
 * and keeping only the result of the first
 *
 * @category Monad
 * @since 1.0.0
 */
export const tap = <A, B>(f: (a: A) => IO<B>) => (ma: IO<A>): IO<A> => tap_(ma, f);

/**
 * ```haskell
 * flatten :: Monad m => m m a -> m a
 * ```
 *
 * Removes one level of nesting from a nested `IO`
 *
 * @category Monad
 * @since 1.0.0
 */
export const flatten = <A>(mma: IO<IO<A>>): IO<A> => chain_(mma, identity);
