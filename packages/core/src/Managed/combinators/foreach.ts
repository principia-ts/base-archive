import * as I from "../_internal/io";
import { Managed } from "../model";

/**
 * Applies the function `f` to each element of the `Iterable<A>` and
 * returns the results in a new `B[]`.
 *
 * For a parallel version of this method, see `foreachPar`.
 * If you do not need the results, see `foreachUnit` for a more efficient implementation.
 */
export function foreach<R, E, A, B>(
  f: (a: A) => Managed<R, E, B>
): (as: Iterable<A>) => Managed<R, E, readonly B[]> {
  return (as) => foreach_(as, f);
}

/**
 * Applies the function `f` to each element of the `Iterable<A>` and
 * returns the results in a new `B[]`.
 *
 * For a parallel version of this method, see `foreachPar_`.
 * If you do not need the results, see `foreachUnit_` for a more efficient implementation.
 */
export function foreach_<R, E, A, B>(as: Iterable<A>, f: (a: A) => Managed<R, E, B>) {
  return new Managed<R, E, readonly B[]>(
    I.map_(
      I.foreach_(as, (a) => f(a).io),
      (res) => {
        const fins = res.map((k) => k[0]);
        const as = res.map((k) => k[1]);

        return [(e) => I.foreach_(fins.reverse(), (fin) => fin(e)), as];
      }
    )
  );
}
