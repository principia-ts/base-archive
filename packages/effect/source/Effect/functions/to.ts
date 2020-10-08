import { done } from "../../XPromise/functions/done";
import type { XPromise } from "../../XPromise/XPromise";
import { chain_, result } from "../core";
import type { Effect } from "../Effect";
import { uninterruptibleMask } from "./interrupt";

/**
 * Returns an effect that keeps or breaks a promise based on the result of
 * this effect. Synchronizes interruption, so if this effect is interrupted,
 * the specified promise will be interrupted, too.
 */
export const to = <E, A>(p: XPromise<E, A>) => <R>(effect: Effect<R, E, A>): Effect<R, never, boolean> =>
   uninterruptibleMask(({ restore }) => chain_(result(restore(effect)), (x) => done(x)(p)));
