import type * as P from "@principia/prelude";
import { pureF } from "@principia/prelude";

import type { Either, URI, V } from "../Either";
import { bind_, flow, identity, pipe, tuple } from "../Function";
import { left, right } from "./constructors";
import { isLeft } from "./guards";

/*
 * -------------------------------------------
 * Either Methods
 * -------------------------------------------
 */

/**
 * ```haskell
 * unit :: () -> Either _ ()
 * ```
 */
export const unit: <E = never>() => Either<E, void> = () => right(undefined);

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
export const map_ = <E, A, B>(fa: Either<E, A>, f: (a: A) => B): Either<E, B> => (isLeft(fa) ? fa : right(f(fa.right)));

/**
 * ```haskell
 * map :: functor f => (a -> b) -> f a -> f b
 * ```
 *
 * lifts a function a -> b to a function f a -> f b
 *
 * @category functor
 * @since 1.0.0
 */
export const map = <A, B>(f: (a: A) => B) => <E>(fa: Either<E, A>): Either<E, B> => map_(fa, f);

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
export const swap = <E, A>(pab: Either<E, A>): Either<A, E> => (isLeft(pab) ? right(pab.left) : left(pab.right));

/**
 * ```haskell
 * bimap_ :: Bifunctor p => (p a b, (a -> c), (b -> d)) -> p c d
 * ```
 *
 * Map a pair of functions over the two type arguments of the bifunctor.
 *
 * @category Bifunctor
 * @since 1.0.0
 */
export const bimap_ = <E, A, G, B>(pab: Either<E, A>, f: (e: E) => G, g: (a: A) => B): Either<G, B> =>
   isLeft(pab) ? left(f(pab.left)) : right(g(pab.right));

/**
 * ```haskell
 * bimap :: Bifunctor p => ((a -> c), (b -> d)) -> p a b -> p c d
 * ```
 *
 * Map a pair of functions over the two type arguments of the bifunctor.
 *
 * @category Bifunctor
 * @since 1.0.0
 */
export const bimap = <E, A, G, B>(f: (e: E) => G, g: (a: A) => B) => (pab: Either<E, A>): Either<G, B> =>
   bimap_(pab, f, g);

/**
 * ```haskell
 * first_ :: Bifunctor p => (p a c, (a -> b)) -> p b c
 * ```
 *
 * Map a function over the first type argument of a bifunctor.
 *
 * @category Bifunctor
 * @since 1.0.0
 */
export const first_ = <E, A, G>(pab: Either<E, A>, f: (e: E) => G): Either<G, A> =>
   isLeft(pab) ? left(f(pab.left)) : pab;

/**
 * ```haskell
 * first :: Bifunctor p => (a -> c) -> p a b -> p c b
 * ```
 *
 * Map a function over the first type argument of a bifunctor.
 *
 * @category Bifunctor
 * @since 1.0.0
 */
export const first = <E, G>(f: (e: E) => G) => <A>(pab: Either<E, A>): Either<G, A> => first_(pab, f);

/**
 * ```haskell
 * mapLeft_ :: Bifunctor p => (p a c, (a -> b)) -> p b c
 * ```
 *
 * Map a function over the first type argument of a bifunctor.
 *
 * @category Bifunctor
 * @since 1.0.0
 */
export const mapLeft_ = first_;

/**
 * ```haskell
 * mapLeft :: Bifunctor p => (a -> c) -> p a b -> p c b
 * ```
 *
 * Map a function over the first type argument of a bifunctor.
 *
 * @category Bifunctor
 * @since 1.0.0
 */
export const mapLeft = first;

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
export const ap_ = <E, A, G, B>(fab: Either<G, (a: A) => B>, fa: Either<E, A>): Either<E | G, B> =>
   isLeft(fab) ? fab : isLeft(fa) ? fa : right(fab.right(fa.right));

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
export const ap = <E, A>(fa: Either<E, A>) => <G, B>(fab: Either<G, (a: A) => B>): Either<E | G, B> => ap_(fab, fa);

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
export const apFirst_ = <E, A, G, B>(fa: Either<E, A>, fb: Either<G, B>): Either<E | G, A> =>
   ap_(
      map_(fa, (a) => () => a),
      fb
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
export const apFirst = <G, B>(fb: Either<G, B>) => <E, A>(fa: Either<E, A>): Either<E | G, A> => apFirst_(fa, fb);

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
export const apSecond_ = <E, A, G, B>(fa: Either<E, A>, fb: Either<G, B>): Either<E | G, B> =>
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
export const apSecond = <G, B>(fb: Either<G, B>) => <E, A>(fa: Either<E, A>): Either<E | G, B> => apSecond_(fa, fb);

/**
 * ```haskell
 * mapBoth_ :: Apply f => (f a, f b, ((a, b) -> c)) -> f c
 * ```
 *
 * Applies both `Either`s and if both are `Right`, maps their results with function `f`, otherwise returns the first `Left`
 *
 * @category Apply
 * @since 1.0.0
 */
export const mapBoth_ = <E, A, G, B, C>(fa: Either<E, A>, fb: Either<G, B>, f: (a: A, b: B) => C): Either<E | G, C> =>
   ap_(
      map_(fa, (a) => (b: B) => f(a, b)),
      fb
   );

/**
 * ```haskell
 * mapBoth :: Apply f => (f b, ((a, b) -> c)) -> f a -> f c
 * ```
 *
 * Applies both `Either`s and if both are `Right`, maps their results with function `f`, otherwise returns the first `Left`
 *
 * @category Apply
 * @since 1.0.0
 */
export const mapBoth = <A, G, B, C>(fb: Either<G, B>, f: (a: A, b: B) => C) => <E>(
   fa: Either<E, A>
): Either<E | G, C> => mapBoth_(fa, fb, f);

/**
 * ```haskell
 * both_ :: Apply f => (f a, f b) -> f (a, b)
 * ```
 *
 * Applies both `Either`s and if both are `Right`, collects their values into a tuple, otherwise, returns the first `Left`
 *
 * @category Apply
 * @since 1.0.0
 */
export const both_ = <E, A, G, B>(fa: Either<E, A>, fb: Either<G, B>): Either<E | G, readonly [A, B]> =>
   mapBoth_(fa, fb, tuple);

/**
 * ```haskell
 * both :: Apply f => f b -> f a -> f (a, b)
 * ```
 *
 * Applies both `Either`s and if both are `Right`, collects their values into a tuple, otherwise, returns the first `Left`
 *
 * @category Apply
 * @since 1.0.0
 */
export const both = <G, B>(fb: Either<G, B>) => <E, A>(fa: Either<E, A>): Either<E | G, readonly [A, B]> =>
   both_(fa, fb);

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
export const lift2 = <A, B, C>(f: (a: A) => (b: B) => C) => <E>(fa: Either<E, A>) => <G>(
   fb: Either<G, B>
): Either<E | G, C> => (isLeft(fa) ? left(fa.left) : isLeft(fb) ? left(fb.left) : right(f(fa.right)(fb.right)));

/**
 * ```haskell
 * pure :: Applicative f => a -> f a
 * ```
 *
 * Lifts a pure expression info an `Either`
 *
 * @category Applicative
 * @since 1.0.0
 */
export const pure: <E = never, A = never>(a: A) => Either<E, A> = right;

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
export const chain_ = <E, A, G, B>(fa: Either<E, A>, f: (a: A) => Either<G, B>): Either<E | G, B> =>
   isLeft(fa) ? fa : f(fa.right);

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
export const chain = <A, G, B>(f: (e: A) => Either<G, B>) => <E>(ma: Either<E, A>): Either<E | G, B> => chain_(ma, f);

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
export const bind = <E, A>(ma: Either<E, A>) => <G, B>(f: (a: A) => Either<G, B>): Either<E | G, B> => chain_(ma, f);

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
export const tap_ = <E, A, G, B>(ma: Either<E, A>, f: (a: A) => Either<G, B>): Either<E | G, A> =>
   chain_(ma, (a) =>
      pipe(
         f(a),
         map(() => a)
      )
   );

/**
 * ```haskell
 * tap :: Monad m => (a -> mb) -> m a -> m a
 * ```
 *
 * Composes computations in sequence, using the return value of one computation as input for the next
 * and keeping only the result of the first
 *
 * @category Monad
 * @since 1.0.0
 */
export const tap = <A, G, B>(f: (a: A) => Either<G, B>) => <E>(ma: Either<E, A>): Either<E | G, A> => tap_(ma, f);

/**
 * ```haskell
 * chainFirst :: Monad m => (a -> m b) -> m a -> m a
 * ```
 * A synonym of `tap`.
 * Composes computations in sequence, using the return value of one computation as input for the next
 * and keeping only the result of the first
 *
 * @category Monad
 * @since 1.0.0
 */
export const chainFirst = tap;

/**
 * ```haskell
 * flatten :: Monad m => m m a -> m a
 * ```
 *
 * Removes one level of nesting from a nested `Either`
 *
 * @category Monad
 * @since 1.0.0
 */
export const flatten: <E, G, A>(mma: Either<E, Either<G, A>>) => Either<E | G, A> = flow(chain(identity));

/**
 * ```haskell
 * traverse_ :: (Applicative f, Traversable t) => (t a, (a -> f b)) -> f (t b)
 * ```
 *
 * Map each element of a structure to an action, evaluate these actions from left to right, and collect the results
 *
 * @category Traversable
 * @since 1.0.0
 */
export const traverse_: P.TraverseFn_<[URI], V> = (F) => (ta, f) =>
   isLeft(ta)
      ? pureF(F)(left(ta.left))
      : pipe(
           f(ta.right),
           F.map((b) => right(b))
        );

/**
 * ```haskell
 * traverse :: (Applicative f, Traversable t) => (a -> f b) -> t a -> f (t b)
 * ```
 *
 * Map each element of a structure to an action, evaluate these actions from left to right, and collect the results
 *
 * @category Traversable
 * @since 1.0.0
 */
export const traverse: P.TraverseFn<[URI], V> = (F) => (f) => (ta) => traverse_(F)(ta, f);

/**
 * ```haskell
 * sequence :: (Applicative f, Traversable t) => t (f a) -> f (t a)
 * ```
 *
 * Evaluate each action in the structure from left to right, and collect the results.
 *
 * @category Traversable
 * @since 1.0.0
 */
export const sequence: P.SequenceFn<[URI], V> = (F) => (ta) => traverse_(F)(ta, identity);

/**
 * ```haskell
 * alt_ :: Alt f => (f a, (() -> f a)) -> f a
 * ```
 *
 * Identifies an associative operation on a type constructor. It is similar to `Semigroup`, except that it applies to types of kind `* -> *`.
 *
 * @category Alt
 * @since 1.0.0
 */
export const alt_ = <E, A, G>(fa: Either<E, A>, that: () => Either<G, A>): Either<E | G, A> =>
   isLeft(fa) ? that() : fa;

/**
 * ```haskell
 * alt :: Alt f => (() -> f a) -> f a -> f a
 * ```
 *
 * Identifies an associative operation on a type constructor. It is similar to `Semigroup`, except that it applies to types of kind `* -> *`.
 *
 * @category Alt
 * @since 1.0.0
 */
export const alt = <G, A>(that: () => Either<G, A>) => <E>(fa: Either<E, A>): Either<E | G, A> => alt_(fa, that);

/**
 * ```haskell
 * extend_ :: Extend w => (w a, (w a -> b)) -> w b
 * ```
 *
 * @category Extend
 * @since 1.0.0
 */
export const extend_ = <E, A, B>(wa: Either<E, A>, f: (wa: Either<E, A>) => B): Either<E, B> =>
   isLeft(wa) ? wa : right(f(wa));

/**
 * ```haskell
 * extend :: Extend w => (w a -> b) -> w a -> w b
 * ```
 *
 * @category Extend
 * @since 1.0.0
 */
export const extend = <E, A, B>(f: (wa: Either<E, A>) => B) => (wa: Either<E, A>): Either<E, B> => extend_(wa, f);

/**
 * ```haskell
 * duplicate :: Extend w => w a -> w (w a)
 * ```
 *
 * @category Extend
 * @since 1.0.0
 */
export const duplicate = <E, A>(wa: Either<E, A>): Either<E, Either<E, A>> => extend_(wa, identity);

/**
 * ```haskell
 * reduce_ :: Foldable f => (f a, b, ((b, a) -> b)) -> b
 * ```
 */
export const reduce_ = <E, A, B>(fa: Either<E, A>, b: B, f: (b: B, a: A) => B): B => (isLeft(fa) ? b : f(b, fa.right));

/**
 * ```haskell
 * reduce :: Foldable f => (b, ((b, a) -> b)) -> f a -> b
 * ```
 */
export const reduce = <A, B>(b: B, f: (b: B, a: A) => B) => <E>(fa: Either<E, A>): B => reduce_(fa, b, f);

/**
 * ```haskell
 * foldMap_ :: (Foldable f, Monoid m) => Instance m b -> (f a, (a -> b)) -> b
 * ```
 */
export const foldMap_ = <M>(M: P.Monoid<M>) => <E, A>(fa: Either<E, A>, f: (a: A) => M): M =>
   isLeft(fa) ? M.nat : f(fa.right);

/**
 * ```haskell
 * foldMap :: (Foldable f, Monoid m) => Instance m b -> (a -> b) -> f a -> b
 * ```
 */
export const foldMap = <M>(M: P.Monoid<M>) => <A>(f: (a: A) => M) => <E>(fa: Either<E, A>): M => foldMap_(M)(fa, f);

/**
 * ```haskell
 * reduceRight_ :: Foldable f => (f a, b, ((b, a) -> b)) -> b
 * ```
 */
export const reduceRight_ = <E, A, B>(fa: Either<E, A>, b: B, f: (a: A, b: B) => B): B =>
   isLeft(fa) ? b : f(fa.right, b);

/**
 * ```haskell
 * reduceRight :: Foldable f => (b, ((b, a) -> b)) -> f a -> b
 * ```
 */
export const reduceRight = <A, B>(b: B, f: (a: A, b: B) => B) => <E>(fa: Either<E, A>): B => reduceRight_(fa, b, f);

/**
 * Compact type Either<E, A> | Either<E1, B> to Either<E | E1, A | B>
 */
export const deunion: <T extends Either<any, any>>(
   fa: T
) => [T] extends [Either<infer E, infer A>] ? Either<E, A> : T = identity as any;

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
export const apS = <N extends string, A, E1, B>(
   name: Exclude<N, keyof A>,
   fb: Either<E1, B>
): (<E>(fa: Either<E, A>) => Either<E | E1, { [K in keyof A | N]: K extends keyof A ? A[K] : B }>) =>
   flow(
      map((a) => (b: B) => bind_(a, name, b)),
      ap(fb)
   );
