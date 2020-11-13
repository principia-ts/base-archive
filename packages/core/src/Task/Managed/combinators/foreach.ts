import * as T from "../_internal/task";
import { Managed } from "../model";

/**
 * Applies the function `f` to each element of the `Iterable<A>` and
 * returns the results in a new `B[]`.
 *
 * For a parallel version of this method, see `foreachPar`.
 * If you do not need the results, see `foreachUnit` for a more efficient implementation.
 */
export function foreach<R, E, A, B>(f: (a: A) => Managed<R, E, B>): (as: Iterable<A>) => Managed<R, E, readonly B[]> {
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
      T.map_(
         T.foreach_(as, (a) => f(a).task),
         (res) => {
            const fins = res.map((k) => k[0]);
            const as = res.map((k) => k[1]);

            return [(e) => T.foreach_(fins.reverse(), (fin) => fin(e)), as];
         }
      )
   );
}
