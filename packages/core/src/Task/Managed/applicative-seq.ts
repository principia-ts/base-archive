import { mapBoth_ } from "./apply-seq";
import type { Managed } from "./model";

/**
 * Returns a managed that executes both this managed and the specified managed,
 * in sequence, combining their results with the specified `f` function.
 */
export function both_<R, E, A, R1, E1, A1>(self: Managed<R, E, A>, that: Managed<R1, E1, A1>) {
   return mapBoth_(self, that, (a, a2) => [a, a2] as [A, A1]);
}

/**
 * Returns a managed that executes both this managed and the specified managed,
 * in sequence, combining their results with the specified `f` function.
 */
export function both<R1, E1, A1>(that: Managed<R1, E1, A1>) {
   return <R, E, A>(self: Managed<R, E, A>) => mapBoth_(self, that, (a, a2) => [a, a2] as [A, A1]);
}
