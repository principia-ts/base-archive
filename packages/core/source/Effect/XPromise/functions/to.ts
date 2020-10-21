import * as T from "../../Effect/core";
import type { Effect } from "../../Effect/model";
import { uninterruptibleMask } from "../../Effect/functions/interrupt";
import type { XPromise } from "../XPromise";
import { done } from "./done";

/**
 * Returns an effect that keeps or breaks a promise based on the result of
 * this effect. Synchronizes interruption, so if this effect is interrupted,
 * the specified promise will be interrupted, too.
 */
export const to = <E, A>(p: XPromise<E, A>) => <R>(effect: Effect<R, E, A>): Effect<R, never, boolean> =>
   uninterruptibleMask(({ restore }) => T.chain_(T.result(restore(effect)), (x) => done(x)(p)));
