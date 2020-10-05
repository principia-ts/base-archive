import { flow, identity, pipe, Predicate, tuple } from "../Function";
import type * as TC from "../typeclass-index";
import { Separated } from "../Utils";
import { getLeft, getRight } from "./combinators";
import { just, nothing } from "./constructors";
import { isNothing } from "./guards";
import type { Maybe, URI, V } from "./Maybe";

/*
 * -------------------------------------------
 * Maybe Methods
 * -------------------------------------------
 */

export const any: TC.AnyF<[URI], V> = () => just(undefined as any);

export const none: TC.NoneF<[URI], V> = nothing;

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
export const _map: TC.UC_MapF<[URI], V> = (fa, f) => (isNothing(fa) ? fa : just(f(fa.value)));

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
export const map: TC.MapF<[URI], V> = (f) => (fa) => _map(fa, f);

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
export const _ap: TC.UC_ApF<[URI], V> = (fab, fa) =>
   isNothing(fab) ? nothing() : isNothing(fa) ? nothing() : just(fab.value(fa.value));

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

export const _apFirst: TC.UC_ApFirstF<[URI], V> = (fa, fb) =>
   _ap(
      _map(fa, (a) => () => a),
      fb
   );

export const apFirst: TC.ApFirstF<[URI], V> = (fb) => (fa) => _apFirst(fa, fb);

export const _apSecond: TC.UC_ApSecondF<[URI], V> = <A, B>(fa: Maybe<A>, fb: Maybe<B>): Maybe<B> =>
   _ap(
      _map(fa, () => (b: B) => b),
      fb
   );

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
   isNothing(fa) ? nothing() : isNothing(fb) ? nothing() : just(f(fa.value)(fb.value));

/**
 * ```haskell
 * _chain :: Monad m => (m a, (a -> m b)) -> m b
 * ```
 *
 * Composes computations in sequence, using the return value of one computation as input for the next
 *
 * @category Uncurried Monad
 * @since 1.0.0
 */
export const _chain: TC.UC_ChainF<[URI], V> = (fa, f) => (isNothing(fa) ? fa : f(fa.value));

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
 * tap :: Monad m => m a -> (a -> m b) -> m a
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
 *
 * A synonym of `tap`
 * Composes computations in sequence, using the return value of one computation as input for the next
 * and keeping only the result of the first
 *
 * @category Monad
 * @since 1.0.0
 */
export const chainFirst: TC.ChainFirstF<[URI], V> = (f) => (ma) => _tap(ma, f);

/**
 * ```haskell
 * pure :: Applicative f => a -> f a
 * ```
 *
 * Lifts a pure expression info a `Maybe`
 *
 * @category Applicative
 * @since 1.0.0
 */
export const pure: TC.PureF<[URI], V> = just;

/**
 * ```haskell
 * flatten :: Monad m => m m a -> m a
 * ```
 *
 * Removes one level of nesting from a nested `Maybe`
 *
 * @category Monad
 * @since 1.0.0
 */
export const flatten: TC.FlattenF<[URI], V> = flow(chain(identity));

/**
 * ```haskell
 * _reduce :: Foldable f => (f a, b, ((b, a) -> b)) -> b
 * ```
 */
export const _reduce: TC.UC_ReduceF<[URI], V> = (fa, b, f) => (isNothing(fa) ? b : f(b, fa.value));

/**
 * ```haskell
 * reduce :: Foldable f => (b, ((b, a) -> b)) -> f a -> b
 * ```
 */
export const reduce: TC.ReduceF<[URI], V> = (b, f) => (fa) => _reduce(fa, b, f);

/**
 * ```haskell
 * _reduceRight :: Foldable f => (f a, b, ((b, a) -> b)) -> b
 * ```
 */
export const _reduceRight: TC.UC_ReduceRightF<[URI], V> = (fa, b, f) =>
   isNothing(fa) ? b : f(fa.value, b);

/**
 * ```haskell
 * reduceRight :: Foldable f => (b, ((b, a) -> b)) -> f a -> b
 * ```
 */
export const reduceRight: TC.ReduceRightF<[URI], V> = (b, f) => (fa) => _reduceRight(fa, b, f);

/**
 * ```haskell
 * _foldMap :: (Foldable f, Monoid m) => Instance m b -> (f a, (a -> b)) -> b
 * ```
 */
export const _foldMap: TC.UC_FoldMapF<[URI], V> = (M) => (fa, f) =>
   isNothing(fa) ? M.empty : f(fa.value);

/**
 * ```haskell
 * foldMap :: (Foldable f, Monoid m) => Instance m b -> (a -> b) -> f a -> b
 * ```
 */
export const foldMap: TC.FoldMapF<[URI], V> = (M) => (f) => (fa) => _foldMap(M)(fa, f);

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
export const _traverse: TC.UC_TraverseF<[URI], V> = (A) => (ta, f) =>
   isNothing(ta) ? A.pure(nothing()) : pipe(f(ta.value), A.map(just));

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
export const traverse: TC.TraverseF<[URI], V> = (A) => (f) => (ta) => _traverse(A)(ta, f);

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
export const sequence: TC.SequenceF<[URI], V> = (A) => (fa) =>
   isNothing(fa) ? A.pure(nothing()) : pipe(fa.value, A.map(just));

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
export const _alt: TC.UC_AltF<[URI], V> = (fa, that) => (isNothing(fa) ? that() : fa);

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
 * Applies both `Maybe`s and if both are `Some`, collects their values into a tuple, otherwise, returns `Nothing`
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
 * Applies both `Maybe`s and if both are `Some`, collects their values into a tuple, otherwise returns `Nothing`
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
 * Applies both `Maybe`s and if both are `Some`,  maps their results with function `f`, otherwise returns `Nothing`
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
 * Applies both `Maybe`s and if both are `Some`, maps their results with function `f`, otherwise returns `Nothing`
 *
 * @category Apply
 * @since 1.0.0
 */
export const mapBoth: TC.MapBothF<[URI], V> = (fb, f) => (fa) => _mapBoth(fa, fb, f);

export const separate: TC.SeparateF<[URI], V> = (fa) => {
   const o = _map(fa, (e) => ({
      left: getLeft(e),
      right: getRight(e)
   }));
   return isNothing(o) ? { left: nothing(), right: nothing() } : o.value;
};

export const _filter: TC.UC_FilterF<[URI], V> = <A>(fa: Maybe<A>, f: Predicate<A>) =>
   isNothing(fa) ? nothing() : f(fa.value) ? fa : nothing();

export const filter: TC.FilterF<[URI], V> = <A>(f: Predicate<A>) => (fa: Maybe<A>) =>
   _filter(fa, f);

/**
 * ```haskell
 * _filterMap :: Filterable f => (f a, (a -> Maybe b)) -> f b
 * ```
 */
export const _mapMaybe: TC.UC_MapMaybeF<[URI], V> = (fa, f) =>
   isNothing(fa) ? nothing() : f(fa.value);

/**
 * ```haskell
 * filterMap :: Filterable f => (a -> Maybe b) -> f a -> f b
 * ```
 */
export const mapMaybe: TC.MapMaybeF<[URI], V> = (f) => (fa) => _mapMaybe(fa, f);

export const compact: TC.CompactF<[URI], V> = flatten;

/**
 * ```haskell
 * _extend :: Extend w => (w a, (w a -> b)) -> w b
 * ```
 */
export const _extend: TC.UC_ExtendF<[URI], V> = (wa, f) =>
   isNothing(wa) ? nothing() : just(f(wa));

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
export const duplicate = <A>(wa: Maybe<A>): Maybe<Maybe<A>> => _extend(wa, identity);

export const _partition: TC.UC_PartitionF<[URI], V> = <A>(
   fa: Maybe<A>,
   f: Predicate<A>
): Separated<Maybe<A>, Maybe<A>> => ({
   left: _filter(fa, (a) => !f(a)),
   right: _filter(fa, f)
});

export const partition: TC.PartitionF<[URI], V> = <A>(f: Predicate<A>) => (fa: Maybe<A>) =>
   _partition(fa, f);

export const _mapEither: TC.UC_MapEitherF<[URI], V> = (fa, f) => separate(_map(fa, f));

export const mapEither: TC.MapEitherF<[URI], V> = (f) => (fa) => _mapEither(fa, f);

export const _wither: TC.UC_WitherF<[URI], V> = (A) => (wa, f) =>
   isNothing(wa) ? A.pure(nothing()) : f(wa.value);

export const wither: TC.WitherF<[URI], V> = (A) => (f) => (wa) => _wither(A)(wa, f);

export const _wilt: TC.UC_WiltF<[URI], V> = (A) => (wa, f) => {
   const o = _map(
      wa,
      flow(
         f,
         A.map((e) => ({
            left: getLeft(e),
            right: getRight(e)
         }))
      )
   );
   return isNothing(o)
      ? A.pure({
           left: nothing(),
           right: nothing()
        })
      : o.value;
};

export const wilt: TC.WiltF<[URI], V> = (A) => (f) => (wa) => _wilt(A)(wa, f);
