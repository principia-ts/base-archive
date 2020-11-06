import * as T from "../_core";
import { foreachUnitPar_ } from "./foreachUnitPar";

/**
 * Applies the function `f` to each element of the `Iterable<A>` in parallel,
 * and returns the results in a new `readonly B[]`.
 *
 * For a sequential version of this method, see `foreach`.
 */
export const foreachPar_ = <R, E, A, B>(
   as: Iterable<A>,
   f: (a: A) => T.Task<R, E, B>
): T.Task<R, E, ReadonlyArray<B>> => {
   const arr = Array.from(as);

   return T.chain_(
      T.total<B[]>(() => []),
      (array) => {
         const fn = ([a, n]: [A, number]) =>
            T.chain_(
               T.suspend(() => f(a)),
               (b) =>
                  T.total(() => {
                     array[n] = b;
                  })
            );
         return T.chain_(
            foreachUnitPar_(
               arr.map((a, n) => [a, n] as [A, number]),
               fn
            ),
            () => T.total(() => array)
         );
      }
   );
};

export const foreachPar = <R, E, A, B>(f: (a: A) => T.Task<R, E, B>) => (
   as: Iterable<A>
): T.Task<R, E, ReadonlyArray<B>> => foreachPar_(as, f);
