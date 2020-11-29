import { foreachPar_ } from "../../AIO/combinators/foreachPar";
import type { Exit } from "../../Exit";
import * as T from "../_internal/aio";
import type { Fiber } from "../model";

/**
 * Awaits on all fibers to be completed, successfully or not.
 */
export const awaitAll = <E, A>(
  as: Iterable<Fiber<E, A>>
): T.AIO<unknown, never, Exit<E, ReadonlyArray<A>>> =>
  T.result(foreachPar_(as, (f) => T.chain_(f.await, T.done)));
