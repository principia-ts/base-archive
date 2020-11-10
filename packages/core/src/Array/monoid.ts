import type { Monoid } from "@principia/prelude/Monoid";
import { makeMonoid } from "@principia/prelude/Monoid";

import { append_ } from "./combinators";
import { empty } from "./constructors";

/*
 * -------------------------------------------
 * Monoid Array
 * -------------------------------------------
 */

export const getMonoid = <A = never>(): Monoid<ReadonlyArray<A>> => makeMonoid(append_, empty());
