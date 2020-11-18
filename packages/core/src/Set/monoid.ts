import type { Eq } from "@principia/prelude/Eq";
import type { Monoid } from "@principia/prelude/Monoid";
import { makeMonoid } from "@principia/prelude/Monoid";

import { union_ } from "./combinators";
import { empty } from "./constructors";

/*
 * -------------------------------------------
 * Monoid Set
 * -------------------------------------------
 */

export function getUnionMonoid<A>(E: Eq<A>): Monoid<ReadonlySet<A>> {
  const unionE_ = union_(E);
  return makeMonoid<ReadonlySet<A>>((x, y) => unionE_(x, y), empty());
}
