import type * as P from "@principia/prelude";
import type * as HKT from "@principia/prelude/HKT";

import { getAltValidationF, getApplicativeValidationF } from "../DSL";
import { Alt } from "./alt";
import { Applicative } from "./applicative";
import { Fallible } from "./fallible";
import type { URI } from "./model";
import { Monad } from "./monad";

/*
 * -------------------------------------------
 * Validation EIO
 * -------------------------------------------
 */

/**
 * @category Instances
 * @since 1.0.0
 */
export const getApplicativeValidation: <E>(
  S: P.Semigroup<E>
) => P.Applicative<[URI], HKT.Fix<"E", E>> = getApplicativeValidationF({
  ...Monad,
  ...Applicative,
  ...Fallible
});

/**
 * @category Instances
 * @since 1.0.0
 */
export const getAltValidation: <E>(
  S: P.Semigroup<E>
) => P.Alt<[URI], HKT.Fix<"E", E>> = getAltValidationF({
  ...Monad,
  ...Alt,
  ...Fallible
});
