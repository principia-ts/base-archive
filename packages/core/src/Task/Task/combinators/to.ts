import { chain_, result } from "../_core";
import { done } from "../../XPromise/combinators/done";
import type { XPromise } from "../../XPromise/model";
import type { Task } from "../model";
import { uninterruptibleMask } from "./interrupt";

/**
 * Returns a task that keeps or breaks a promise based on the result of
 * this effect. Synchronizes interruption, so if this effect is interrupted,
 * the specified promise will be interrupted, too.
 */
export function to<E, A>(p: XPromise<E, A>): <R>(effect: Task<R, E, A>) => Task<R, never, boolean> {
  return (effect) =>
    uninterruptibleMask(({ restore }) => chain_(result(restore(effect)), (x) => done(x)(p)));
}
