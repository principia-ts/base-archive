import { bind_, flow, identity, pipe, tuple } from "../Function";
import type * as TC from "../typeclass-index";
import { left, right } from "./constructors";
import type { Either, URI, V } from "./Either";
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
 * _map :: Functor f => (f a, (a -> b)) -> f b
 * ```
 *
 * Lifts a function a -> b to a function f a -> f b
 *
 * @category Functor
 * @since 1.0.0
 */
export const _map = <E, A, B>(fa: Either<E, A>, f: (a: A) => B): Either<E, B> => (isLeft(fa) ? fa : right(f(fa.right)));

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
export const map = <A, B>(f: (a: A) => B) => <E>(fa: Either<E, A>): Either<E, B> => _map(fa, f);

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
 * _bimap :: Bifunctor p => (p a b, (a -> c), (b -> d)) -> p c d
 * ```
 *
 * Map a pair of functions over the two type arguments of the bifunctor.
 *
 * @category Bifunctor
 * @since 1.0.0
 */
export const _bimap = <E, A, G, B>(pab: Either<E, A>, f: (e: E) => G, g: (a: A) => B): Either<G, B> =>
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
   _bimap(pab, f, g);

/**
 * ```haskell
 * _first :: Bifunctor p => (p a c, (a -> b)) -> p b c
 * ```
 *
 * Map a function over the first type argument of a bifunctor.
 *
 * @category Bifunctor
 * @since 1.0.0
 */
export const _first = <E, A, G>(pab: Either<E, A>, f: (e: E) => G): Either<G, A> =>
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
export const first = <E, G>(f: (e: E) => G) => <A>(pab: Either<E, A>): Either<G, A> => _first(pab, f);

/**
 * ```haskell
 * _mapLeft :: Bifunctor p => (p a c, (a -> b)) -> p b c
 * ```
 *
 * Map a function over the first type argument of a bifunctor.
 *
 * @category Bifunctor
 * @since 1.0.0
 */
export const _mapLeft = _first;

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
 * _ap :: Apply f => (f (a -> b), f a) -> f b
 * ```
 *
 * Apply a function to an argument under a type constructor
 *
 * @category Apply
 * @since 1.0.0
 */
export const _ap = <E, A, G, B>(fab: Either<G, (a: A) => B>, fa: Either<E, A>): Either<E | G, B> =>
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
export const ap = <E, A>(fa: Either<E, A>) => <G, B>(fab: Either<G, (a: A) => B>): Either<E | G, B> => _ap(fab, fa);

/**
 * ```haskell
 * _apFirst :: Apply f => (f a, f b) -> f a
 * ```
 *
 * Combine two effectful actions, keeping only the result of the first
 *
 * @category Uncurried Apply
 * @since 1.0.0
 */
export const _apFirst = <E, A, G, B>(fa: Either<E, A>, fb: Either<G, B>): Either<E | G, A> =>
   _ap(
      _map(fa, (a) => () => a),
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
export const apFirst = <G, B>(fb: Either<G, B>) => <E, A>(fa: Either<E, A>): Either<E | G, A> => _apFirst(fa, fb);

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
export const _apSecond = <E, A, G, B>(fa: Either<E, A>, fb: Either<G, B>): Either<E | G, B> =>
   _ap(
      _map(fa, () => (b: B) => b),
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
export const apSecond = <G, B>(fb: Either<G, B>) => <E, A>(fa: Either<E, A>): Either<E | G, B> => _apSecond(fa, fb);

/**
 * ```haskell
 * _mapBoth :: Apply f => (f a, f b, ((a, b) -> c)) -> f c
 * ```
 *
 * Applies both `Either`s and if both are `Right`, maps their results with function `f`, otherwise returns the first `Left`
 *
 * @category Apply
 * @since 1.0.0
 */
export const _mapBoth = <E, A, G, B, C>(fa: Either<E, A>, fb: Either<G, B>, f: (a: A, b: B) => C): Either<E | G, C> =>
   _ap(
      _map(fa, (a) => (b: B) => f(a, b)),
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
): Either<E | G, C> => _mapBoth(fa, fb, f);

/**
 * ```haskell
 * _both :: Apply f => (f a, f b) -> f (a, b)
 * ```
 *
 * Applies both `Either`s and if both are `Right`, collects their values into a tuple, otherwise, returns the first `Left`
 *
 * @category Apply
 * @since 1.0.0
 */
export const _both = <E, A, G, B>(fa: Either<E, A>, fb: Either<G, B>): Either<E | G, readonly [A, B]> =>
   _mapBoth(fa, fb, tuple);

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
   _both(fa, fb);

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
 * _chain :: Monad m => (m a, (a -> m b)) -> m b
 * ```
 *
 * Composes computations in sequence, using the return value of one computation as input for the next
 *
 * @category Monad
 * @since 1.0.0
 */
export const _chain = <E, A, G, B>(fa: Either<E, A>, f: (a: A) => Either<G, B>): Either<E | G, B> =>
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
export const chain = <A, G, B>(f: (e: A) => Either<G, B>) => <E>(ma: Either<E, A>): Either<E | G, B> => _chain(ma, f);

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
export const bind = <E, A>(ma: Either<E, A>) => <G, B>(f: (a: A) => Either<G, B>): Either<E | G, B> => _chain(ma, f);

/**
 * ```haskell
 * _tap :: Monad m => (ma, (a -> m b)) -> m a
 * ```
 *
 * Composes computations in sequence, using the return value of one computation as input for the next
 * and keeping only the result of the first
 *
 * @category Monad
 * @since 1.0.0
 */
export const _tap = <E, A, G, B>(ma: Either<E, A>, f: (a: A) => Either<G, B>): Either<E | G, A> =>
   _chain(ma, (a) =>
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
export const tap = <A, G, B>(f: (a: A) => Either<G, B>) => <E>(ma: Either<E, A>): Either<E | G, A> => _tap(ma, f);

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
 * _traverse :: (Applicative f, Traversable t) => Instance f -> (t a, (a -> f b)) -> f (t b)
 * ```
 *
 * Map each element of a structure to an action, evaluate these actions from left to right, and collect the results
 *
 * @category Uncurried Traversable
 * @since 1.0.0
 */
export const _traverse: TC.UC_TraverseF<[URI], V> = (F) => (ta, f) =>
   isLeft(ta)
      ? F.pure(left(ta.left))
      : pipe(
           f(ta.right),
           F.map((b) => right(b))
        );

/**
 * ```haskell
 * traverse :: (Applicative f, Traversable t) => Instance f -> (a -> f b) -> t a -> f (t b)
 * ```
 *
 * Map each element of a structure to an action, evaluate these actions from left to right, and collect the results
 *
 * @category Traversable
 * @since 1.0.0
 */
export const traverse: TC.TraverseF<[URI], V> = (F) => (f) => (ta) => _traverse(F)(ta, f);

/**
 * ```haskell
 * sequence :: (Applicative f, Traversable t) => Instance f -> t (f a) -> f (t a)
 * ```
 *
 * Evaluate each action in the structure from left to right, and collect the results.
 *
 * @category Traversable
 * @since 1.0.0
 */
export const sequence: TC.SequenceF<[URI], V> = (F) => (fa) =>
   isLeft(fa)
      ? F.pure(left(fa.left))
      : pipe(
           fa.right,
           F.map((a) => right(a))
        );

/**
 * ```haskell
 * _alt :: Alt f => (f a, (() -> f a)) -> f a
 * ```
 *
 * Identifies an associative operation on a type constructor. It is similar to `Semigroup`, except that it applies to types of kind `* -> *`.
 *
 * @category Alt
 * @since 1.0.0
 */
export const _alt = <E, A, G>(fa: Either<E, A>, that: () => Either<G, A>): Either<E | G, A> =>
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
export const alt = <G, A>(that: () => Either<G, A>) => <E>(fa: Either<E, A>): Either<E | G, A> => _alt(fa, that);

/**
 * ```haskell
 * _extend :: Extend w => (w a, (w a -> b)) -> w b
 * ```
 */
export const _extend = <E, A, B>(wa: Either<E, A>, f: (wa: Either<E, A>) => B): Either<E, B> =>
   isLeft(wa) ? wa : right(f(wa));

/**
 * ```haskell
 * extend :: Extend w => (w a -> b) -> w a -> w b
 * ```
 */
export const extend = <E, A, B>(f: (wa: Either<E, A>) => B) => (wa: Either<E, A>): Either<E, B> => _extend(wa, f);

/**
 * ```haskell
 * duplicate :: Extend w => w a -> w (w a)
 * ```
 */
export const duplicate = <E, A>(wa: Either<E, A>): Either<E, Either<E, A>> => _extend(wa, identity);

/**
 * ```haskell
 * _reduce :: Foldable f => (f a, b, ((b, a) -> b)) -> b
 * ```
 */
export const _reduce = <E, A, B>(fa: Either<E, A>, b: B, f: (b: B, a: A) => B): B => (isLeft(fa) ? b : f(b, fa.right));

/**
 * ```haskell
 * reduce :: Foldable f => (b, ((b, a) -> b)) -> f a -> b
 * ```
 */
export const reduce = <A, B>(b: B, f: (b: B, a: A) => B) => <E>(fa: Either<E, A>): B => _reduce(fa, b, f);

/**
 * ```haskell
 * _foldMap :: (Foldable f, Monoid m) => Instance m b -> (f a, (a -> b)) -> b
 * ```
 */
export const _foldMap = <M>(M: TC.Monoid<M>) => <E, A, B>(fa: Either<E, A>, f: (a: A) => M): M =>
   isLeft(fa) ? M.empty : f(fa.right);

/**
 * ```haskell
 * foldMap :: (Foldable f, Monoid m) => Instance m b -> (a -> b) -> f a -> b
 * ```
 */
export const foldMap = <M>(M: TC.Monoid<M>) => <A>(f: (a: A) => M) => <E>(fa: Either<E, A>): M => _foldMap(M)(fa, f);

/**
 * ```haskell
 * _reduceRight :: Foldable f => (f a, b, ((b, a) -> b)) -> b
 * ```
 */
export const _reduceRight = <E, A, B>(fa: Either<E, A>, b: B, f: (a: A, b: B) => B): B =>
   isLeft(fa) ? b : f(fa.right, b);

/**
 * ```haskell
 * reduceRight :: Foldable f => (b, ((b, a) -> b)) -> f a -> b
 * ```
 */
export const reduceRight = <A, B>(b: B, f: (a: A, b: B) => B) => <E>(fa: Either<E, A>): B => _reduceRight(fa, b, f);

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
