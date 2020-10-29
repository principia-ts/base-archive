import type * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import { tuple } from "../Function";
import { left, right } from "./constructors";
import { Functor } from "./functor";
import { isLeft, isRight } from "./guards";
import type { URI, V } from "./model";
import { unit } from "./unit";

/*
 * -------------------------------------------
 * Validation Either
 * -------------------------------------------
 */

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
