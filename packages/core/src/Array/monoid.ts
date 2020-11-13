import type { Monoid } from "@principia/prelude/Monoid";
import { makeMonoid } from "@principia/prelude/Monoid";

import { concat_ } from "./combinators";
import { empty } from "./constructors";

/*
 * -------------------------------------------
 * Monoid Array
 * -------------------------------------------
 */

export function getMonoid<A = never>(): Monoid<ReadonlyArray<A>> {
   return makeMonoid(concat_, empty());
}
