import type { Either } from "../Either";
import type { Predicate, Refinement } from "../Function";
import { bind_, flow, identity, pipe, tuple } from "../Function";
import type { Monoid } from "../Monoid";
import type * as TC from "../typeclass-index";
import type { Separated } from "../Utils";
import { getLeft, getRight } from "./combinators";
import { none, some } from "./constructors";
import { isNone } from "./guards";
import type { Option, URI, V } from "./Option";

/*
 * -------------------------------------------
 * Option Methods
 * -------------------------------------------
 */

export const unit = (): Option<void> => some(undefined);

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
export const map_ = <A, B>(fa: Option<A>, f: (a: A) => B): Option<B> => (isNone(fa) ? fa : some(f(fa.value)));

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
export const map = <A, B>(f: (a: A) => B) => (fa: Option<A>): Option<B> => map_(fa, f);

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
export const ap_ = <A, B>(fab: Option<(a: A) => B>, fa: Option<A>): Option<B> =>
   isNone(fab) ? none() : isNone(fa) ? none() : some(fab.value(fa.value));

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
export const ap = <A>(fa: Option<A>) => <B>(fab: Option<(a: A) => B>): Option<B> => ap_(fab, fa);

export const apFirst_ = <A, B>(fa: Option<A>, fb: Option<B>): Option<A> =>
   ap_(
      map_(fa, (a) => () => a),
      fb
   );

export const apFirst = <B>(fb: Option<B>) => <A>(fa: Option<A>): Option<A> => apFirst_(fa, fb);

export const apSecond_ = <A, B>(fa: Option<A>, fb: Option<B>): Option<B> =>
   ap_(
      map_(fa, () => (b: B) => b),
      fb
   );

export const apSecond = <B>(fb: Option<B>) => <A>(fa: Option<A>): Option<B> => apSecond_(fa, fb);

/**
 * ```haskell
 * mapBoth_ :: Apply f => (f a, f b, ((a, b) -> c)) -> f c
 * ```
 *
 * Applies both `Maybe`s and if both are `Some`,  maps their results with function `f`, otherwise returns `Nothing`
 *
 * @category Apply
 * @since 1.0.0
 */
export const mapBoth_ = <A, B, C>(fa: Option<A>, fb: Option<B>, f: (a: A, b: B) => C): Option<C> =>
   ap_(
      map_(fa, (a) => (b: B) => f(a, b)),
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

export const mapBoth: TC.MapBothF<[URI], V> = (fb, f) => (fa) => mapBoth_(fa, fb, f);
/**
 * ```haskell
 * both_ :: Apply f => (f a, f b) -> f (a, b)
 * ```
 *
 * Applies both `Maybe`s and if both are `Some`, collects their values into a tuple, otherwise, returns `Nothing`
 *
 * @category Apply
 * @since 1.0.0
 */
export const both_ = <A, B>(fa: Option<A>, fb: Option<B>): Option<readonly [A, B]> => mapBoth_(fa, fb, tuple);

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
export const both = <B>(fb: Option<B>) => <A>(fa: Option<A>): Option<readonly [A, B]> => both_(fa, fb);

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
export const lift2 = <A, B, C>(f: (a: A) => (b: B) => C) => (fa: Option<A>) => (fb: Option<B>): Option<C> =>
   isNone(fa) ? none() : isNone(fb) ? none() : some(f(fa.value)(fb.value));

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
export const pure: <A>(a: A) => Option<A> = some;

/**
 * ```haskell
 * chain_ :: Monad m => (m a, (a -> m b)) -> m b
 * ```
 *
 * Composes computations in sequence, using the return value of one computation as input for the next
 *
 * @category Uncurried Monad
 * @since 1.0.0
 */
export const chain_ = <A, B>(ma: Option<A>, f: (a: A) => Option<B>): Option<B> => (isNone(ma) ? ma : f(ma.value));

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
export const chain = <A, B>(f: (a: A) => Option<B>) => (ma: Option<A>): Option<B> => chain_(ma, f);

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
export const bind = <A>(ma: Option<A>) => <B>(f: (a: A) => Option<B>): Option<B> => chain_(ma, f);

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
export const tap_ = <A, B>(ma: Option<A>, f: (a: A) => Option<B>): Option<A> =>
   chain_(ma, (a) =>
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
export const tap = <A, B>(f: (a: A) => Option<B>) => (ma: Option<A>): Option<A> => tap_(ma, f);

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
export const flatten: <A>(mma: Option<Option<A>>) => Option<A> = flow(chain(identity));

/**
 * ```haskell
 * reduce_ :: Foldable f => (f a, b, ((b, a) -> b)) -> b
 * ```
 */
export const reduce_ = <A, B>(fa: Option<A>, b: B, f: (b: B, a: A) => B): B => (isNone(fa) ? b : f(b, fa.value));

/**
 * ```haskell
 * reduce :: Foldable f => (b, ((b, a) -> b)) -> f a -> b
 * ```
 */
export const reduce = <A, B>(b: B, f: (b: B, a: A) => B) => (fa: Option<A>): B => reduce_(fa, b, f);

/**
 * ```haskell
 * reduceRight_ :: Foldable f => (f a, b, ((b, a) -> b)) -> b
 * ```
 */
export const reduceRight_ = <A, B>(fa: Option<A>, b: B, f: (a: A, b: B) => B): B => (isNone(fa) ? b : f(fa.value, b));

/**
 * ```haskell
 * reduceRight :: Foldable f => (b, ((b, a) -> b)) -> f a -> b
 * ```
 */
export const reduceRight = <A, B>(b: B, f: (a: A, b: B) => B) => (fa: Option<A>): B => reduceRight_(fa, b, f);

/**
 * ```haskell
 * foldMap_ :: (Foldable f, Monoid m) => Instance m b -> (f a, (a -> b)) -> b
 * ```
 */
export const foldMap_ = <M>(M: Monoid<M>) => <A>(fa: Option<A>, f: (a: A) => M): M =>
   isNone(fa) ? M.empty : f(fa.value);

/**
 * ```haskell
 * foldMap :: (Foldable f, Monoid m) => Instance m b -> (a -> b) -> f a -> b
 * ```
 */
export const foldMap = <M>(M: Monoid<M>) => <A>(f: (a: A) => M) => (fa: Option<A>): M => foldMap_(M)(fa, f);

export const separate = <A, B>(fa: Option<Either<A, B>>): Separated<Option<A>, Option<B>> => {
   const o = map_(fa, (e) => ({
      left: getLeft(e),
      right: getRight(e)
   }));
   return isNone(o) ? { left: none(), right: none() } : o.value;
};

export const compact: <A>(ta: Option<Option<A>>) => Option<A> = flatten;

export const filter_: {
   <A, B extends A>(fa: Option<A>, refinement: Refinement<A, B>): Option<B>;
   <A>(fa: Option<A>, predicate: Predicate<A>): Option<A>;
} = <A>(fa: Option<A>, predicate: Predicate<A>) => (isNone(fa) ? none() : predicate(fa.value) ? fa : none());

export const filter: {
   <A, B extends A>(refinement: Refinement<A, B>): (fa: Option<A>) => Option<B>;
   <A>(predicate: Predicate<A>): (fa: Option<A>) => Option<A>;
} = <A>(predicate: Predicate<A>) => (fa: Option<A>) => filter_(fa, predicate);

export const partition_: {
   <A, B extends A>(fa: Option<A>, refinement: Refinement<A, B>): Separated<Option<A>, Option<B>>;
   <A>(fa: Option<A>, predicate: Predicate<A>): Separated<Option<A>, Option<A>>;
} = <A>(fa: Option<A>, predicate: Predicate<A>): Separated<Option<A>, Option<A>> => ({
   left: filter_(fa, (a) => !predicate(a)),
   right: filter_(fa, predicate)
});

export const partition: {
   <A, B extends A>(refinement: Refinement<A, B>): (fa: Option<A>) => Separated<Option<A>, Option<B>>;
   <A>(predicate: Predicate<A>): (fa: Option<A>) => Separated<Option<A>, Option<A>>;
} = <A>(predicate: Predicate<A>) => (fa: Option<A>) => partition_(fa, predicate);

export const mapEither_ = <A, B, C>(fa: Option<A>, f: (a: A) => Either<B, C>): Separated<Option<B>, Option<C>> =>
   separate(map_(fa, f));

export const mapEither = <A, B, C>(f: (a: A) => Either<B, C>) => (fa: Option<A>): Separated<Option<B>, Option<C>> =>
   mapEither_(fa, f);

/**
 * ```haskell
 * mapOption_ :: Filterable f => (f a, (a -> Maybe b)) -> f b
 * ```
 */
export const mapOption_ = <A, B>(fa: Option<A>, f: (a: A) => Option<B>): Option<B> =>
   isNone(fa) ? none() : f(fa.value);

/**
 * ```haskell
 * mapOption :: Filterable f => (a -> Maybe b) -> f a -> f b
 * ```
 */
export const mapOption = <A, B>(f: (a: A) => Option<B>) => (fa: Option<A>): Option<B> => mapOption_(fa, f);

/**
 * ```haskell
 * traverse_ :: (Applicative f, Traversable t) => Instance f -> (t a, (a -> f b)) -> f (t b)
 * ```
 *
 * Map each element of a structure to an action, evaluate these actions from left to right, and collect the results
 *
 * @category Uncurried Traversable
 * @since 1.0.0
 */
export const traverse_: TC.UC_TraverseF<[URI], V> = (A) => (ta, f) =>
   isNone(ta) ? A.pure(none()) : pipe(f(ta.value), A.map(some));

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
export const traverse: TC.TraverseF<[URI], V> = (A) => (f) => (ta) => traverse_(A)(ta, f);

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
   isNone(fa) ? A.pure(none()) : pipe(fa.value, A.map(some));

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
export const alt_ = <A>(fa: Option<A>, that: () => Option<A>): Option<A> => (isNone(fa) ? that() : fa);

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
export const alt = <A>(that: () => Option<A>) => (fa: Option<A>): Option<A> => alt_(fa, that);

/**
 * ```haskell
 * extend_ :: Extend w => (w a, (w a -> b)) -> w b
 * ```
 */
export const extend_ = <A, B>(wa: Option<A>, f: (wa: Option<A>) => B): Option<B> => (isNone(wa) ? none() : some(f(wa)));

/**
 * ```haskell
 * extend :: Extend w => (w a -> b) -> w a -> w b
 * ```
 */
export const extend = <A, B>(f: (wa: Option<A>) => B) => (wa: Option<A>): Option<B> => extend_(wa, f);

/**
 * ```haskell
 * duplicate :: Extend w => w a -> w (w a)
 * ```
 */
export const duplicate = <A>(wa: Option<A>): Option<Option<A>> => extend_(wa, identity);

export const wither_: TC.UC_WitherF<[URI], V> = (A) => (wa, f) => (isNone(wa) ? A.pure(none()) : f(wa.value));

export const wither: TC.WitherF<[URI], V> = (A) => (f) => (wa) => wither_(A)(wa, f);

export const wilt_: TC.UC_WiltF<[URI], V> = (A) => (wa, f) => {
   const o = map_(
      wa,
      flow(
         f,
         A.map((e) => ({
            left: getLeft(e),
            right: getRight(e)
         }))
      )
   );
   return isNone(o)
      ? A.pure({
           left: none(),
           right: none()
        })
      : o.value;
};

export const wilt: TC.WiltF<[URI], V> = (A) => (f) => (wa) => wilt_(A)(wa, f);

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
   fb: Option<B>
): (<E>(fa: Option<A>) => Option<{ [K in keyof A | N]: K extends keyof A ? A[K] : B }>) =>
   flow(
      map((a) => (b: B) => bind_(a, name, b)),
      ap(fb)
   );
