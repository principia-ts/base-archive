import * as T from "../../AIO/_core";
import { uninterruptibleMask } from "../../AIO/combinators/interrupt";
import type { AIO } from "../../AIO/model";
import type { XPromise } from "../model";
import { done } from "./done";

/**
 * Returns an AIO that keeps or breaks a promise based on the result of
 * this effect. Synchronizes interruption, so if this effect is interrupted,
 * the specified promise will be interrupted, too.
 */
export function to<E, A>(p: XPromise<E, A>) {
  return <R>(effect: AIO<R, E, A>): AIO<R, never, boolean> =>
    uninterruptibleMask(({ restore }) => T.chain_(T.result(restore(effect)), (x) => done(x)(p)));
}
