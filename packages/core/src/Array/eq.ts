import type { Eq } from "@principia/prelude/Eq";
import { fromEquals } from "@principia/prelude/Eq";

/*
 * -------------------------------------------
 * Eq Array
 * -------------------------------------------
 */

export function getEq<A>(E: Eq<A>): Eq<ReadonlyArray<A>> {
   return fromEquals((xs, ys) => xs === ys || (xs.length === ys.length && xs.every((x, i) => E.equals_(x, ys[i]))));
}
