import type * as P from "@principia/prelude";
import type * as HKT from "@principia/prelude/HKT";

import { getFilterableF } from "../DSL";
import { Applicative } from "./applicative";
import { Fallible } from "./fallible";
import type { URI } from "./model";
import { Monad } from "./monad";

/*
 * -------------------------------------------
 * Filterable EIO
 * -------------------------------------------
 */

/**
 * @category Instances
 * @since 1.0.0
 */
export const getFilterable: <E>(
  M: P.Monoid<E>
) => P.Filterable<[URI], HKT.Fix<"E", E>> = getFilterableF({
  ...Monad,
  ...Fallible,
  ...Applicative
});
