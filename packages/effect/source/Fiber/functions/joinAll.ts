import * as T from "../../Effect/core";
import type { Fiber } from "../Fiber";
import { awaitAll } from "./awaitAll";

/**
 * Joins all fibers, awaiting their _successful_ completion.
 * Attempting to join a fiber that has erred will result in
 * a catchable error, _if_ that error does not result from interruption.
 */
export const joinAll = <E, A>(as: Iterable<Fiber<E, A>>) =>
   T._tap(T._chain(awaitAll(as), T.done), () => T._foreach(as, (f) => f.inheritRefs));
