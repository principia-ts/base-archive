import * as I from "../_internal/io";
import type { Fiber } from "../model";
import { awaitAll } from "./awaitAll";

/**
 * Joins all fibers, awaiting their _successful_ completion.
 * Attempting to join a fiber that has erred will result in
 * a catchable error, _if_ that error does not result from interruption.
 */
export const joinAllFibers = <E, A>(as: Iterable<Fiber<E, A>>) =>
  I.tap_(I.chain_(awaitAll(as), I.done), () => I.foreach_(as, (f) => f.inheritRefs));
