import * as T from "../_internal/task";
import type { Exit } from "../../Exit";
import { foreachPar_ } from "../../Task/combinators/foreachPar";
import type { Fiber } from "../model";

/**
 * Awaits on all fibers to be completed, successfully or not.
 */
export const awaitAll = <E, A>(
  as: Iterable<Fiber<E, A>>
): T.Task<unknown, never, Exit<E, ReadonlyArray<A>>> =>
  T.result(foreachPar_(as, (f) => T.chain_(f.await, T.done)));
