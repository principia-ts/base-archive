import * as T from "../../Task/_core";
import { uninterruptibleMask } from "../../Task/combinators/interrupt";
import type { Task } from "../../Task/model";
import type { XPromise } from "../model";
import { done } from "./done";

/**
 * Returns a task that keeps or breaks a promise based on the result of
 * this effect. Synchronizes interruption, so if this effect is interrupted,
 * the specified promise will be interrupted, too.
 */
export function to<E, A>(p: XPromise<E, A>) {
   return <R>(effect: Task<R, E, A>): Task<R, never, boolean> =>
      uninterruptibleMask(({ restore }) => T.chain_(T.result(restore(effect)), (x) => done(x)(p)));
}
