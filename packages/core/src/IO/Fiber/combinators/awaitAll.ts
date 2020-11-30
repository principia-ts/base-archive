import { foreachPar_ } from "../../combinators/foreachPar";
import type { Exit } from "../../Exit";
import * as I from "../_internal/io";
import type { Fiber } from "../model";

/**
 * Awaits on all fibers to be completed, successfully or not.
 */
export const awaitAll = <E, A>(
  as: Iterable<Fiber<E, A>>
): I.IO<unknown, never, Exit<E, ReadonlyArray<A>>> =>
  I.result(foreachPar_(as, (f) => I.chain_(f.await, I.done)));
