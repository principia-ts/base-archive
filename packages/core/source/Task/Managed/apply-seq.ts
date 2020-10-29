import { map_ } from "./functor";
import type { Managed } from "./model";
import { chain_ } from "./monad";

/**
 * Returns a managed that executes both this managed and the specified managed,
 * in sequence, combining their results with the specified `f` function.
 */
export const mapBoth = <A, B, R1, E1, A1>(that: Managed<R1, E1, A1>, f: (a: A, a2: A1) => B) => <R, E>(
   self: Managed<R, E, A>
) => mapBoth_(self, that, f);

/**
 * Returns a managed that executes both this managed and the specified managed,
 * in sequence, combining their results with the specified `f` function.
 */
export const mapBoth_ = <R, E, A, R1, E1, A1, B>(
   self: Managed<R, E, A>,
   that: Managed<R1, E1, A1>,
   f: (a: A, a2: A1) => B
) => chain_(self, (a) => map_(that, (a2) => f(a, a2)));
