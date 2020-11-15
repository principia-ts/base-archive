import type { Separated } from "@principia/prelude/Utils";

import * as A from "../Array/_core";
import type { Either } from "../Either";
import { map_ } from "./functor";

/*
 * -------------------------------------------
 * Filterable Iterable
 * -------------------------------------------
 */

export function partitionMap<A, A1, A2>(
   f: (a: A) => Either<A1, A2>
): (as: Iterable<A>) => Separated<Iterable<A1>, Iterable<A2>> {
   return (as) => A.separate(Array.from(map_(as, f)));
}
