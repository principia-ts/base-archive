import type { Semigroup } from "@principia/prelude";
import type { Monoid } from "@principia/prelude/Monoid";
import { makeMonoid } from "@principia/prelude/Monoid";
import { fromCombine } from "@principia/prelude/Semigroup";

import { combine, empty } from "./constructors";
import type { FreeMonoid } from "./model";

/*
 * -------------------------------------------
 * FreeMonoid Instances
 * -------------------------------------------
 */

/**
 * @category Instances
 * @since 1.0.0
 */
export function getSemigroup<A = never>(): Semigroup<FreeMonoid<A>> {
  return fromCombine(combine);
}

/**
 * @category Instances
 * @since 1.0.0
 */
export function getMonoid<A = never>(): Monoid<FreeMonoid<A>> {
  return makeMonoid(getSemigroup<A>().combine_, empty());
}
