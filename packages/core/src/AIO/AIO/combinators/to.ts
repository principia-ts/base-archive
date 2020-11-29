import { done } from "../../XPromise/combinators/done";
import type { XPromise } from "../../XPromise/model";
import { chain_, result } from "../_core";
import type { AIO } from "../model";
import { uninterruptibleMask } from "./interrupt";

/**
 * Returns an AIO that keeps or breaks a promise based on the result of
 * this effect. Synchronizes interruption, so if this effect is interrupted,
 * the specified promise will be interrupted, too.
 */
export function to<E, A>(p: XPromise<E, A>): <R>(effect: AIO<R, E, A>) => AIO<R, never, boolean> {
  return (effect) =>
    uninterruptibleMask(({ restore }) => chain_(result(restore(effect)), (x) => done(x)(p)));
}
