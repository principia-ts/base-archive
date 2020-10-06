import { Either } from "../Either";
import { bind_, flow, identity, pipe, Predicate, Refinement, tuple } from "../Function";
import { Monoid } from "../Monoid";
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

export const unit = (): Maybe<void> => just(undefined);

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
export const _map = <A, B>(fa: Maybe<A>, f: (a: A) => B): Maybe<B> => (isNothing(fa) ? fa : just(f(fa.value)));

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
export const map = <A, B>(f: (a: A) => B) => (fa: Maybe<A>): Maybe<B> => _map(fa, f);

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
export const _ap = <A, B>(fab: Maybe<(a: A) => B>, fa: Maybe<A>): Maybe<B> =>
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
export const ap = <A>(fa: Maybe<A>) => <B>(fab: Maybe<(a: A) => B>): Maybe<B> => _ap(fab, fa);

export const _apFirst = <A, B>(fa: Maybe<A>, fb: Maybe<B>): Maybe<A> =>
   _ap(
      _map(fa, (a) => () => a),
      fb
   );

export const apFirst = <B>(fb: Maybe<B>) => <A>(fa: Maybe<A>): Maybe<A> => _apFirst(fa, fb);

export const _apSecond = <A, B>(fa: Maybe<A>, fb: Maybe<B>): Maybe<B> =>
   _ap(
      _map(fa, () => (b: B) => b),
      fb
   );

export const apSecond = <B>(fb: Maybe<B>) => <A>(fa: Maybe<A>): Maybe<B> => _apSecond(fa, fb);

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
export const _mapBoth = <A, B, C>(fa: Maybe<A>, fb: Maybe<B>, f: (a: A, b: B) => C): Maybe<C> =>
   _ap(
      _map(fa, (a) => (b: B) => f(a, b)),
      fb
   );

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
export const _both = <A, B>(fa: Maybe<A>, fb: Maybe<B>): Maybe<readonly [A, B]> => _mapBoth(fa, fb, tuple);

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
export const both = <B>(fb: Maybe<B>) => <A>(fa: Maybe<A>): Maybe<readonly [A, B]> => _both(fa, fb);

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
export const lift2 = <A, B, C>(f: (a: A) => (b: B) => C) => (fa: Maybe<A>) => (fb: Maybe<B>): Maybe<C> =>
   isNothing(fa) ? nothing() : isNothing(fb) ? nothing() : just(f(fa.value)(fb.value));

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
export const pure: <A>(a: A) => Maybe<A> = just;

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
export const _chain = <A, B>(ma: Maybe<A>, f: (a: A) => Maybe<B>): Maybe<B> => (isNothing(ma) ? ma : f(ma.value));

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
export const chain = <A, B>(f: (a: A) => Maybe<B>) => (ma: Maybe<A>): Maybe<B> => _chain(ma, f);

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
export const bind = <A>(ma: Maybe<A>) => <B>(f: (a: A) => Maybe<B>): Maybe<B> => _chain(ma, f);

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
export const _tap = <A, B>(ma: Maybe<A>, f: (a: A) => Maybe<B>): Maybe<A> =>
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
export const tap = <A, B>(f: (a: A) => Maybe<B>) => (ma: Maybe<A>): Maybe<A> => _tap(ma, f);

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
export const chainFirst = tap;

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
export const flatten: <A>(mma: Maybe<Maybe<A>>) => Maybe<A> = flow(chain(identity));

/**
 * ```haskell
 * _reduce :: Foldable f => (f a, b, ((b, a) -> b)) -> b
 * ```
 */
export const _reduce = <A, B>(fa: Maybe<A>, b: B, f: (b: B, a: A) => B): B => (isNothing(fa) ? b : f(b, fa.value));

/**
 * ```haskell
 * reduce :: Foldable f => (b, ((b, a) -> b)) -> f a -> b
 * ```
 */
export const reduce = <A, B>(b: B, f: (b: B, a: A) => B) => (fa: Maybe<A>): B => _reduce(fa, b, f);

/**
 * ```haskell
 * _reduceRight :: Foldable f => (f a, b, ((b, a) -> b)) -> b
 * ```
 */
export const _reduceRight = <A, B>(fa: Maybe<A>, b: B, f: (a: A, b: B) => B): B => (isNothing(fa) ? b : f(fa.value, b));

/**
 * ```haskell
 * reduceRight :: Foldable f => (b, ((b, a) -> b)) -> f a -> b
 * ```
 */
export const reduceRight = <A, B>(b: B, f: (a: A, b: B) => B) => (fa: Maybe<A>): B => _reduceRight(fa, b, f);

/**
 * ```haskell
 * _foldMap :: (Foldable f, Monoid m) => Instance m b -> (f a, (a -> b)) -> b
 * ```
 */
export const _foldMap = <M>(M: Monoid<M>) => <A>(fa: Maybe<A>, f: (a: A) => M): M =>
   isNothing(fa) ? M.empty : f(fa.value);

/**
 * ```haskell
 * foldMap :: (Foldable f, Monoid m) => Instance m b -> (a -> b) -> f a -> b
 * ```
 */
export const foldMap = <M>(M: Monoid<M>) => <A>(f: (a: A) => M) => (fa: Maybe<A>): M => _foldMap(M)(fa, f);

export const separate = <A, B>(fa: Maybe<Either<A, B>>): Separated<Maybe<A>, Maybe<B>> => {
   const o = _map(fa, (e) => ({
      left: getLeft(e),
      right: getRight(e)
   }));
   return isNothing(o) ? { left: nothing(), right: nothing() } : o.value;
};

export const compact: <A>(ta: Maybe<Maybe<A>>) => Maybe<A> = flatten;

export const _filter: {
   <A, B extends A>(fa: Maybe<A>, refinement: Refinement<A, B>): Maybe<B>;
   <A>(fa: Maybe<A>, predicate: Predicate<A>): Maybe<A>;
} = <A>(fa: Maybe<A>, predicate: Predicate<A>) => (isNothing(fa) ? nothing() : predicate(fa.value) ? fa : nothing());

export const filter: {
   <A, B extends A>(refinement: Refinement<A, B>): (fa: Maybe<A>) => Maybe<B>;
   <A>(predicate: Predicate<A>): (fa: Maybe<A>) => Maybe<A>;
} = <A>(predicate: Predicate<A>) => (fa: Maybe<A>) => _filter(fa, predicate);

export const _partition: {
   <A, B extends A>(fa: Maybe<A>, refinement: Refinement<A, B>): Separated<Maybe<A>, Maybe<B>>;
   <A>(fa: Maybe<A>, predicate: Predicate<A>): Separated<Maybe<A>, Maybe<A>>;
} = <A>(fa: Maybe<A>, predicate: Predicate<A>): Separated<Maybe<A>, Maybe<A>> => ({
   left: _filter(fa, (a) => !predicate(a)),
   right: _filter(fa, predicate)
});

export const partition: {
   <A, B extends A>(refinement: Refinement<A, B>): (fa: Maybe<A>) => Separated<Maybe<A>, Maybe<B>>;
   <A>(predicate: Predicate<A>): (fa: Maybe<A>) => Separated<Maybe<A>, Maybe<A>>;
} = <A>(predicate: Predicate<A>) => (fa: Maybe<A>) => _partition(fa, predicate);

export const _mapEither = <A, B, C>(fa: Maybe<A>, f: (a: A) => Either<B, C>): Separated<Maybe<B>, Maybe<C>> =>
   separate(_map(fa, f));

export const mapEither = <A, B, C>(f: (a: A) => Either<B, C>) => (fa: Maybe<A>): Separated<Maybe<B>, Maybe<C>> =>
   _mapEither(fa, f);

/**
 * ```haskell
 * _mapMaybe :: Filterable f => (f a, (a -> Maybe b)) -> f b
 * ```
 */
export const _mapMaybe = <A, B>(fa: Maybe<A>, f: (a: A) => Maybe<B>): Maybe<B> =>
   isNothing(fa) ? nothing() : f(fa.value);

/**
 * ```haskell
 * filterMap :: Filterable f => (a -> Maybe b) -> f a -> f b
 * ```
 */
export const mapMaybe = <A, B>(f: (a: A) => Maybe<B>) => (fa: Maybe<A>): Maybe<B> => _mapMaybe(fa, f);

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
export const _alt = <A>(fa: Maybe<A>, that: () => Maybe<A>): Maybe<A> => (isNothing(fa) ? that() : fa);

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
export const alt = <A>(that: () => Maybe<A>) => (fa: Maybe<A>): Maybe<A> => _alt(fa, that);

/**
 * ```haskell
 * _extend :: Extend w => (w a, (w a -> b)) -> w b
 * ```
 */
export const _extend = <A, B>(wa: Maybe<A>, f: (wa: Maybe<A>) => B): Maybe<B> =>
   isNothing(wa) ? nothing() : just(f(wa));

/**
 * ```haskell
 * extend :: Extend w => (w a -> b) -> w a -> w b
 * ```
 */
export const extend = <A, B>(f: (wa: Maybe<A>) => B) => (wa: Maybe<A>): Maybe<B> => _extend(wa, f);

/**
 * ```haskell
 * duplicate :: Extend w => w a -> w (w a)
 * ```
 */
export const duplicate = <A>(wa: Maybe<A>): Maybe<Maybe<A>> => _extend(wa, identity);

export const _wither: TC.UC_WitherF<[URI], V> = (A) => (wa, f) => (isNothing(wa) ? A.pure(nothing()) : f(wa.value));

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
   fb: Maybe<B>
): (<E>(fa: Maybe<A>) => Maybe<{ [K in keyof A | N]: K extends keyof A ? A[K] : B }>) =>
   flow(
      map((a) => (b: B) => bind_(a, name, b)),
      ap(fb)
   );
