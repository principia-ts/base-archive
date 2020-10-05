import * as T from "../../Effect/core";
import { uninterruptibleMask } from "../../Effect/functions/interrupt";
import { XPromise } from "../XPromise";
import { done } from "./done";

/**
 * Returns an effect that keeps or breaks a promise based on the result of
 * this effect. Synchronizes interruption, so if this effect is interrupted,
 * the specified promise will be interrupted, too.
 */
export const to = <E, A>(p: XPromise<E, A>) => <R>(
   effect: T.Effect<R, E, A>
): T.Effect<R, never, boolean> =>
   uninterruptibleMask(({ restore }) => T._chain(T.result(restore(effect)), (x) => done(x)(p)));
