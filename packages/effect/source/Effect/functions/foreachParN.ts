import { pipe } from "@principia/core/Function";

import * as Sema from "../../Semaphore";
import * as T from "../core";
import { foreachPar_ } from "./foreachPar";
/**
 * Applies the functionw `f` to each element of the `Iterable<A>` in parallel,
 * and returns the results in a new `readonly B[]`.
 *
 * Unlike `foreachPar`, this method will use at most up to `n` fibers.
 */
export const foreachParN_ = (n: number) => <A, R, E, B>(
   as: Iterable<A>,
   f: (a: A) => T.Effect<R, E, B>
): T.Effect<R, E, ReadonlyArray<B>> =>
   pipe(
      Sema.makeSemaphore(n),
      T.chain((s) => foreachPar_(as, (a) => Sema.withPermit(s)(f(a))))
   );

export const foreachParN = (n: number) => <R, E, A, B>(f: (a: A) => T.Effect<R, E, B>) => (
   as: Iterable<A>
): T.Effect<R, E, ReadonlyArray<B>> => foreachParN_(n)(as, f);
