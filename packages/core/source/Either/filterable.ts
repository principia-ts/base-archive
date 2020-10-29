import type * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";
import type { Separated } from "@principia/prelude/Utils";

import type { Predicate } from "../Function";
import { left, right } from "./constructors";
import { Functor } from "./functor";
import { isLeft } from "./guards";
import type { Either, URI, V } from "./model";

/*
 * -------------------------------------------
 * Filterable Either
 * -------------------------------------------
 */

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
