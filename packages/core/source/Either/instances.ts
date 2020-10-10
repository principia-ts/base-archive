import * as P from "@principia/prelude";
import type { Eq } from "@principia/prelude/Eq";
import * as HKT from "@principia/prelude/HKT";
import type { Show } from "@principia/prelude/Show";
import type { Separated } from "@principia/prelude/Utils";

import type { Either, URI, V } from "../Either";
import type { Predicate } from "../Function";
import { pipe, tuple } from "../Function";
import { left, right } from "./constructors";
import { isLeft, isRight } from "./guards";
import {
   alt,
   alt_,
   ap,
   ap_,
   bimap,
   bimap_,
   both,
   both_,
   extend,
   first,
   first_,
   flatten,
   foldMap,
   foldMap_,
   map,
   map_,
   mapBoth,
   mapBoth_,
   reduce,
   reduce_,
   reduceRight,
   reduceRight_,
   sequence,
   traverse,
   traverse_,
   unit
} from "./methods";

/*
 * -------------------------------------------
 * Either Typeclass Instances
 * -------------------------------------------
 */

/**
 * ```haskell
 * getEq :: (Eq e, Eq a) -> Eq (Either a e)
 * ```
 *
 * @category Instances
 * @since 1.0.0
 */
export const getEq = <E, A>(eqE: Eq<E>, eqA: Eq<A>): Eq<Either<E, A>> => {
   const equals_ = (x: Either<E, A>, y: Either<E, A>) =>
      x === y || (isLeft(x) ? isLeft(y) && eqE.equals_(x.left, y.left) : isRight(y) && eqA.equals_(x.right, y.right));
   return {
      equals_,
      equals: (y) => (x) => equals_(x, y)
   };
};

/**
 * ```haskell
 * getShow :: (Show e, Show a) -> Show (Either e a)
 * ```
 *
 * @category Instances
 * @since 1.0.0
 */
export const getShow = <E, A>(showE: Show<E>, showA: Show<A>): Show<Either<E, A>> => ({
   show: (fa) => (isLeft(fa) ? `left(${showE.show(fa.left)})` : `right(${showA.show(fa.right)})`)
});

/**
 * @category Instances
 * @since 1.0.0
 */
export const Functor: P.Functor<[URI], V> = HKT.instance({
   map,
   map_
});

export const Apply: P.Apply<[URI], V> = HKT.instance({
   ...Functor,
   ap,
   ap_,
   mapBoth,
   mapBoth_
});

export const sequenceT = P.sequenceTF(Apply);

export const mapN: P.MapNFn<[URI], V> = P.mapNF(Apply);

export const sequenceS = P.sequenceSF(Apply);

/**
 * @category Instances
 * @since 1.0.0
 */
export const Applicative: P.Applicative<[URI], V> = HKT.instance({
   ...Functor,
   both_,
   both,
   unit
});

/**
 * @category Instances
 * @since 1.0.0
 */
export const Monad: P.Monad<[URI], V> = HKT.instance({
   ...Functor,
   unit,
   flatten
});

/**
 * @category Instances
 * @since 1.0.0
 */
export const Foldable: P.Foldable<[URI], V> = HKT.instance({
   reduce_,
   foldMap_,
   reduceRight_,
   reduce,
   foldMap,
   reduceRight
});

/**
 * @category Instances
 * @since 1.0.0
 */
export const Traversable: P.Traversable<[URI], V> = HKT.instance({
   ...Functor,
   ...Foldable,
   traverse_,
   sequence,
   traverse
});

/**
 * @category Instances
 * @since 1.0.0
 */
export const Bifunctor: P.Bifunctor<[URI], V> = HKT.instance({
   bimap_,
   bimap,
   first_,
   first,
   second_: map_,
   second: map
});

/**
 * @category Instances
 * @since 1.0.0
 */
export const Alt: P.Alt<[URI], V> = HKT.instance({
   ...Functor,
   alt_,
   alt
});

/**
 * @category Instances
 * @since 1.0.0
 */
export const Extend: P.Extend<[URI], V> = HKT.instance({
   ...Functor,
   extend
});

/**
 * @category Instances
 * @since 1.0.0
 */
export const MonadFail: P.MonadFail<[URI], V> = HKT.instance({
   ...Monad,
   fail: left
});

export const Do: P.Do<[URI], V> = P.deriveDo(Monad);

/**
 * ```haskell
 * getSemigroup :: <e, a>Semigroup a -> Semigroup (Either e a)
 * ```
 *
 * Semigroup returning the left-most non-`Left` value. If both operands are `Right`s then the inner values are
 * concatenated using the provided `Semigroup`
 *
 * @category Instances
 * @since 1.0.0
 */
export const getSemigroup = <E, A>(S: P.Semigroup<A>): P.Semigroup<Either<E, A>> => {
   const combine_: P.CombineFn_<Either<E, A>> = (x, y) =>
      isLeft(y) ? x : isLeft(x) ? y : right(S.combine_(x.right, y.right));
   return {
      combine_,
      combine: (y) => (x) => combine_(x, y)
   };
};

/**
 * ```haskell
 * getApplySemigroup :: <e, a>Semigroup a -> Semigroup (Either e a)
 * ```
 *
 * Semigroup returning the left-most `Left` value. If both operands are `Right`s then the inner values
 * are concatenated using the provided `Semigroup`
 *
 * @category Instances
 * @since 1.0.0
 */
export const getApplySemigroup = <E, A>(S: P.Semigroup<A>): P.Semigroup<Either<E, A>> => {
   const combine_ = (x: Either<E, A>, y: Either<E, A>) =>
      isLeft(y) ? y : isLeft(x) ? x : right(S.combine_(x.right, y.right));
   return {
      combine_,
      combine: (y) => (x) => combine_(x, y)
   };
};

/**
 * @category Instances
 * @since 1.0.0
 */
export const getApplyMonoid = <E, A>(M: P.Monoid<A>): P.Monoid<Either<E, A>> => ({
   ...getApplySemigroup<E, A>(M),
   nat: right(M.nat)
});

export const getCompactable = <E>(M: P.Monoid<E>) =>
   HKT.instance<P.Compactable<[URI], V & HKT.Fix<"E", E>>>({
      compact: (fa) => {
         return isLeft(fa) ? fa : fa.right._tag === "None" ? left(M.nat) : right(fa.right.value);
      },

      separate: (fa) => {
         return isLeft(fa)
            ? { left: fa, right: fa }
            : isLeft(fa.right)
            ? { left: right(fa.right.left), right: left(M.nat) }
            : { left: left(M.nat), right: right(fa.right.right) };
      }
   });

/**
 * ```haskell
 * getFilterable :: Monoid e -> Filterable (Either e _)
 * ```
 *
 * Builds a `Filterable` instance for `Either` given `Monoid` for the left side
 *
 * @category Instances
 * @since 1.0.0
 */
export const getFilterable = <E>(M: P.Monoid<E>): P.Filterable<[URI], V & HKT.Fix<"E", E>> => {
   type V_ = V & HKT.Fix<"E", E>;

   const empty = left(M.nat);

   const mapEither_: P.MapEitherFn_<[URI], V_> = (fa, f) => {
      if (isLeft(fa)) {
         return { left: fa, right: fa };
      }
      const e = f(fa.right);
      return isLeft(e) ? { left: right(e.left), right: empty } : { left: empty, right: right(e.right) };
   };

   const partition_: P.PartitionFn_<[URI], V_> = <A>(
      fa: Either<E, A>,
      predicate: Predicate<A>
   ): Separated<Either<E, A>, Either<E, A>> => {
      return isLeft(fa)
         ? { left: fa, right: fa }
         : predicate(fa.right)
         ? { left: empty, right: right(fa.right) }
         : { left: right(fa.right), right: empty };
   };

   const mapOption_: P.MapOptionFn_<[URI], V_> = (fa, f) => {
      if (isLeft(fa)) {
         return fa;
      }
      const ob = f(fa.right);
      return ob._tag === "None" ? empty : right(ob.value);
   };

   const filter_: P.FilterFn_<[URI], V_> = <A>(fa: Either<E, A>, predicate: Predicate<A>): Either<E, A> =>
      isLeft(fa) ? fa : predicate(fa.right) ? fa : empty;

   return HKT.instance<P.Filterable<[URI], V_>>({
      ...Functor,
      filter_: filter_,
      mapOption_: mapOption_,
      partition_: partition_,
      mapEither_: mapEither_,
      filter: <A>(predicate: Predicate<A>) => (fa: Either<E, A>) => filter_(fa, predicate),
      mapOption: (f) => (fa) => mapOption_(fa, f),
      partition: <A>(predicate: Predicate<A>) => (fa: Either<E, A>) => partition_(fa, predicate),
      mapEither: (f) => (fa) => mapEither_(fa, f)
   });
};

/**
 * ```haskell
 * getWitherable :: Monoid e -> Witherable (Either e _)
 * ```
 *
 * Builds a `Witherable` instance for `Either` given `Monoid` for the left side
 *
 * @category Instances
 * @since 1.0.0
 */
export const getWitherable = <E>(M: P.Monoid<E>): P.Witherable<[URI], V & HKT.Fix<"E", E>> => {
   type V_ = V & HKT.Fix<"E", E>;

   const Compactable = getCompactable(M);

   const wither_: P.WitherFn_<[URI], V_> = (G) => (wa, f) => {
      const traverseF = traverse_(G);
      return pipe(traverseF(wa, f), G.map(Compactable.compact));
   };

   const wilt_: P.WiltFn_<[URI], V_> = (G) => (wa, f) => {
      const traverseF = traverse_(G);
      return pipe(traverseF(wa, f), G.map(Compactable.separate));
   };

   return HKT.instance<P.Witherable<[URI], V_>>({
      wither_: wither_,
      wilt_: wilt_,
      wither: (G) => (f) => (wa) => wither_(G)(wa, f),
      wilt: (G) => (f) => (wa) => wilt_(G)(wa, f)
   });
};

/**
 * @category Instances
 * @since 1.0.0
 */
export const getApplicativeValidation = <E>(S: P.Semigroup<E>): P.Applicative<[URI], V & HKT.Fix<"E", E>> => {
   type V_ = V & HKT.Fix<"E", E>;

   const bothV_: P.BothFn_<[URI], V_> = (fa, fb) =>
      isLeft(fa)
         ? isLeft(fb)
            ? left(S.combine_(fa.left, fb.left))
            : fa
         : isLeft(fb)
         ? fb
         : right(tuple(fa.right, fb.right));

   return HKT.instance<P.Applicative<[URI], V_>>({
      ...Functor,
      both_: bothV_,
      both: (fb) => (fa) => bothV_(fa, fb),
      unit
   });
};

/**
 * @category Instances
 * @since 1.0.0
 */
export const getAltValidation = <E>(S: P.Semigroup<E>): P.Alt<[URI], V & HKT.Fix<"E", E>> => {
   type V_ = V & HKT.Fix<"E", E>;

   const altV_: P.AltFn_<[URI], V_> = (fa, that) => {
      if (isRight(fa)) {
         return fa;
      }
      const ea = that();
      return isLeft(ea) ? left(S.combine_(fa.left, ea.left)) : ea;
   };

   return HKT.instance<P.Alt<[URI], V_>>({
      ...Functor,
      alt_: altV_,
      alt: (that) => (fa) => altV_(fa, that)
   });
};
