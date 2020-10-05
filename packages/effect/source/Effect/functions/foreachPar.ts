import * as T from "../core";
import { _foreachUnitPar } from "./foreachUnitPar";

/**
 * Applies the function `f` to each element of the `Iterable<A>` in parallel,
 * and returns the results in a new `readonly B[]`.
 *
 * For a sequential version of this method, see `foreach`.
 */
export const _foreachPar = <R, E, A, B>(
   as: Iterable<A>,
   f: (a: A) => T.Effect<R, E, B>
): T.Effect<R, E, ReadonlyArray<B>> => {
   const arr = Array.from(as);

   return T._chain(
      T.total<B[]>(() => []),
      (array) => {
         const fn = ([a, n]: [A, number]) =>
            T._chain(
               T.suspend(() => f(a)),
               (b) =>
                  T.total(() => {
                     array[n] = b;
                  })
            );
         return T._chain(
            _foreachUnitPar(
               arr.map((a, n) => [a, n] as [A, number]),
               fn
            ),
            () => T.total(() => array)
         );
      }
   );
};

export const foreachPar = <X, R, E, A, B>(f: (a: A) => T.Effect<R, E, B>) => (
   as: Iterable<A>
): T.Effect<R, E, ReadonlyArray<B>> => _foreachPar(as, f);
