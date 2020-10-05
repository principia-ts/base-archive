import { flow, identity, pipe, tuple } from "../Function";
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
 * any :: () -> Either e Any
 * ```
 */
export const any: TC.AnyF<[URI], V> = () => right({} as any);

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
export const _map: TC.UC_MapF<[URI], V> = (fa, f) => (isLeft(fa) ? fa : right(f(fa.right)));

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
export const map: TC.MapF<[URI], V> = (f) => (fa) => _map(fa, f);

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
export const swap: TC.SwapF<[URI], V> = (pab) => (isLeft(pab) ? right(pab.left) : left(pab.right));

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
export const _bimap: TC.UC_BimapF<[URI], V> = (pab, f, g) =>
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
export const bimap: TC.BimapF<[URI], V> = (f, g) => (pab) => _bimap(pab, f, g);

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
export const _first: TC.UC_FirstF<[URI], V> = (pab, f) => (isLeft(pab) ? left(f(pab.left)) : pab);

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
export const first: TC.FirstF<[URI], V> = (f) => (pab) => _first(pab, f);

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
export const _ap: TC.UC_ApF<[URI], V> = (fab, fa) =>
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
export const ap: TC.ApF<[URI], V> = (fa) => (fab) => _ap(fab, fa);

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
export const _apFirst: TC.UC_ApFirstF<[URI], V> = (fa, fb) =>
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
export const apFirst: TC.ApFirstF<[URI], V> = (fb) => (fa) => _apFirst(fa, fb);

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
export const _apSecond: TC.UC_ApSecondF<[URI], V> = <E1, B, E, A>(
   fa: Either<E, A>,
   fb: Either<E1, B>
) =>
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
export const apSecond: TC.ApSecondF<[URI], V> = (fb) => (fa) => _apSecond(fa, fb);

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
export const lift2: TC.Lift2F<[URI], V> = (f) => (fa) => (fb) =>
   isLeft(fa) ? left(fa.left) : isLeft(fb) ? left(fb.left) : right(f(fa.right)(fb.right));

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
export const pure: TC.PureF<[URI], V> = right;

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
export const _chain: TC.UC_ChainF<[URI], V> = (fa, f) => (isLeft(fa) ? fa : f(fa.right));

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
export const chain: TC.ChainF<[URI], V> = (f) => (fa) => _chain(fa, f);

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
export const bind: TC.BindF<[URI], V> = (fa) => (f) => _chain(fa, f);

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
export const _tap: TC.UC_TapF<[URI], V> = (ma, f) =>
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
export const tap: TC.TapF<[URI], V> = (f) => (ma) => _tap(ma, f);

/**
 * ```haskell
 * chainFirst :: Monad m => (a -> m b) -> m a -> m a
 * ```
 * A synonym of `tap`
 * Composes computations in sequence, using the return value of one computation as input for the next
 * and keeping only the result of the first
 *
 * @category Monad
 * @since 1.0.0
 */
export const chainFirst: TC.ChainFirstF<[URI], V> = tap;

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
export const flatten: TC.FlattenF<[URI], V> = flow(chain(identity));

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
export const _alt: TC.UC_AltF<[URI], V> = (fa, that) => (isLeft(fa) ? that() : fa);

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
export const alt: TC.AltF<[URI], V> = (that) => (fa) => _alt(fa, that);

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
export const _both: TC.UC_BothF<[URI], V> = (fa, fb) =>
   _chain(fa, (a) => _map(fb, (b) => tuple(a, b)));

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
export const both: TC.BothF<[URI], V> = (fb) => (fa) => _both(fa, fb);

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
export const _mapBoth: TC.UC_MapBothF<[URI], V> = (fa, fb, f) =>
   _chain(fa, (a) => _map(fb, (b) => f(a, b)));

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
export const mapBoth: TC.MapBothF<[URI], V> = (fb, f) => (fa) => _mapBoth(fa, fb, f);

/**
 * ```haskell
 * _extend :: Extend w => (w a, (w a -> b)) -> w b
 * ```
 */
export const _extend: TC.UC_ExtendF<[URI], V> = (wa, f) => (isLeft(wa) ? wa : right(f(wa)));

/**
 * ```haskell
 * extend :: Extend w => (w a -> b) -> w a -> w b
 * ```
 */
export const extend: TC.ExtendF<[URI], V> = (f) => (wa) => _extend(wa, f);

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
export const _reduce: TC.UC_ReduceF<[URI], V> = (fa, b, f) => (isLeft(fa) ? b : f(b, fa.right));

/**
 * ```haskell
 * reduce :: Foldable f => (b, ((b, a) -> b)) -> f a -> b
 * ```
 */
export const reduce: TC.ReduceF<[URI], V> = (b, f) => (fa) => _reduce(fa, b, f);

/**
 * ```haskell
 * _foldMap :: (Foldable f, Monoid m) => Instance m b -> (f a, (a -> b)) -> b
 * ```
 */
export const _foldMap: TC.UC_FoldMapF<[URI], V> = (M) => (fa, f) =>
   isLeft(fa) ? M.empty : f(fa.right);

/**
 * ```haskell
 * foldMap :: (Foldable f, Monoid m) => Instance m b -> (a -> b) -> f a -> b
 * ```
 */
export const foldMap: TC.FoldMapF<[URI], V> = (M) => (f) => (fa) => _foldMap(M)(fa, f);

/**
 * ```haskell
 * _reduceRight :: Foldable f => (f a, b, ((b, a) -> b)) -> b
 * ```
 */
export const _reduceRight: TC.UC_ReduceRightF<[URI], V> = (fa, b, f) =>
   isLeft(fa) ? b : f(fa.right, b);

/**
 * ```haskell
 * reduceRight :: Foldable f => (b, ((b, a) -> b)) -> f a -> b
 * ```
 */
export const reduceRight: TC.ReduceRightF<[URI], V> = (b, f) => (fa) => _reduceRight(fa, b, f);

/**
 * Compact type Either<E, A> | Either<E1, B> to Either<E | E1, A | B>
 */
export const deunion: <T extends Either<any, any>>(
   fa: T
) => [T] extends [Either<infer E, infer A>] ? Either<E, A> : T = identity as any;
