import { pipe } from "@principia/core/Function";

import * as Sema from "../../Semaphore";
import * as T from "../core";
import { _foreachPar } from "./foreachPar";
/**
 * Applies the functionw `f` to each element of the `Iterable<A>` in parallel,
 * and returns the results in a new `readonly B[]`.
 *
 * Unlike `foreachPar`, this method will use at most up to `n` fibers.
 */
export const _foreachParN = (n: number) => <A, R, E, B>(
   as: Iterable<A>,
   f: (a: A) => T.Effect<R, E, B>
): T.Effect<R, E, ReadonlyArray<B>> =>
   pipe(
      Sema.makeSemaphore(n),
      T.chain((s) => _foreachPar(as, (a) => Sema.withPermit(s)(f(a))))
   );

export const foreachParN = (n: number) => <X, R, E, A, B>(f: (a: A) => T.Effect<R, E, B>) => (
   as: Iterable<A>
): T.Effect<R, E, ReadonlyArray<B>> => _foreachParN(n)(as, f);
