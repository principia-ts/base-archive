import * as T from "../_internal/effect";
import type { Exit } from "../../Exit";
import type { Fiber } from "../Fiber";

/**
 * Awaits on all fibers to be completed, successfully or not.
 */
export const awaitAll = <E, A>(
   as: Iterable<Fiber<E, A>>
): T.Effect<unknown, never, Exit<E, ReadonlyArray<A>>> =>
   T.result(T._foreachPar(as, (f) => T._chain(f.await, T.done)));
