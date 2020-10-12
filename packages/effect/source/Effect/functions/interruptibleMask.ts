import { checkInterruptible } from "../core";
import type { Effect } from "../Effect";
import type { InterruptStatusRestore } from "./interrupt";
import { InterruptStatusRestoreImpl, makeInterruptible } from "./interrupt";

/**
 * Makes the effect interruptible, but passes it a restore function that
 * can be used to restore the inherited interruptibility from whatever region
 * the effect is composed into.
 */
export const interruptibleMask = <R, E, A>(f: (restore: InterruptStatusRestore) => Effect<R, E, A>) =>
   checkInterruptible((flag) => makeInterruptible(f(new InterruptStatusRestoreImpl(flag))));
