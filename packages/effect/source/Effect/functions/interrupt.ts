import type { Either } from "@principia/core/Either";
import { left } from "@principia/core/Either";
import type { Option } from "@principia/core/Option";
import { none, some } from "@principia/core/Option";

import * as C from "../../Cause";
import { interruptible, uninterruptible } from "../../Fiber/core";
import type { InterruptStatus } from "../../Fiber/Fiber";
import type { FiberId } from "../../Fiber/FiberId";
import { join } from "../../Fiber/functions/join";
import { AtomicReference, OneShot } from "../../Support";
import {
   asyncOption,
   chain_,
   checkInterruptible,
   flatten,
   foldCauseM_,
   halt,
   pure,
   suspend,
   total,
   unit
} from "../core";
import { forkDaemon } from "../core-scope";
import type { Canceler, Effect, IO, UIO } from "../Effect";
import { InterruptStatusInstruction } from "../Effect";
import { checkFiberId } from "./checkFiberId";

export const interruptAs = (fiberId: FiberId): IO<never, never> => halt(C.interrupt(fiberId));

export const interrupt: Effect<unknown, never, never> = chain_(checkFiberId(), interruptAs);

export const setInterruptStatus_ = <R, E, A>(effect: Effect<R, E, A>, flag: InterruptStatus): Effect<R, E, A> =>
   InterruptStatusInstruction(effect, flag);

export const setInterruptStatus = (flag: InterruptStatus) => <R, E, A>(ma: Effect<R, E, A>): Effect<R, E, A> =>
   setInterruptStatus_(ma, flag);

export const makeInterruptible = <R, E, A>(ma: Effect<R, E, A>): Effect<R, E, A> =>
   setInterruptStatus_(ma, interruptible);

export const makeUninterruptible = <R, E, A>(ma: Effect<R, E, A>): Effect<R, E, A> =>
   setInterruptStatus_(ma, uninterruptible);

/**
 * Makes the effect uninterruptible, but passes it a restore function that
 * can be used to restore the inherited interruptibility from whatever region
 * the effect is composed into.
 */
export const uninterruptibleMask = <R, E, A>(
   f: (restore: InterruptStatusRestore) => Effect<R, E, A>
): Effect<R, E, A> => checkInterruptible((flag) => makeUninterruptible(f(new InterruptStatusRestoreImpl(flag))));

/**
 * Calls the specified function, and runs the effect it returns, if this
 * effect is interrupted.
 */
export const onInterrupt_ = <R, E, A, R1>(
   ma: Effect<R, E, A>,
   cleanup: (interruptors: ReadonlySet<FiberId>) => Effect<R1, never, any>
) =>
   uninterruptibleMask(({ restore }) =>
      foldCauseM_(
         restore(ma),
         (cause) => (C.isInterrupt(cause) ? chain_(cleanup(C.interruptors(cause)), () => halt(cause)) : halt(cause)),
         pure
      )
   );

/**
 * Calls the specified function, and runs the effect it returns, if this
 * effect is interrupted (allows for expanding error).
 */
export function onInterruptExtended_<R, E, A, R2, E2>(self: Effect<R, E, A>, cleanup: () => Effect<R2, E2, any>) {
   return uninterruptibleMask(({ restore }) =>
      foldCauseM_(
         restore(self),
         (cause) =>
            C.isInterrupt(cause)
               ? foldCauseM_(
                    cleanup(),
                    (_) => halt(_),
                    () => halt(cause)
                 )
               : halt(cause),
         pure
      )
   );
}

/**
 * Returns an effect whose interruption will be disconnected from the
 * fiber's own interruption, being performed in the background without
 * slowing down the fiber's interruption.
 *
 * This method is useful to create "fast interrupting" effects. For
 * example, if you call this on a bracketed effect, then even if the
 * effect is "stuck" in acquire or release, its interruption will return
 * immediately, while the acquire / release are performed in the
 * background.
 *
 * See timeout and race for other applications.
 */
export const disconnect = <R, E, A>(effect: Effect<R, E, A>): Effect<R, E, A> =>
   uninterruptibleMask(({ restore }) =>
      chain_(checkFiberId(), (id) =>
         chain_(forkDaemon(restore(effect)), (fiber) =>
            onInterrupt_(restore(join(fiber)), () => forkDaemon(fiber.interruptAs(id)))
         )
      )
   );

/**
 * Used to restore the inherited interruptibility
 */
export interface InterruptStatusRestore {
   readonly restore: <R, E, A>(effect: Effect<R, E, A>) => Effect<R, E, A>;
   readonly force: <R, E, A>(effect: Effect<R, E, A>) => Effect<R, E, A>;
}

export class InterruptStatusRestoreImpl implements InterruptStatusRestore {
   constructor(readonly flag: InterruptStatus) {
      this.restore = this.restore.bind(this);
      this.force = this.force.bind(this);
   }

   restore<R, E, A>(ma: Effect<R, E, A>): Effect<R, E, A> {
      return setInterruptStatus_(ma, this.flag);
   }

   force<R, E, A>(ma: Effect<R, E, A>): Effect<R, E, A> {
      if (this.flag.isUninteruptible) {
         return makeInterruptible(disconnect(makeUninterruptible(ma)));
      }
      return setInterruptStatus_(ma, this.flag);
   }
}

/**
 * Imports an asynchronous side-effect into an effect. The side-effect
 * has the option of returning the value synchronously, which is useful in
 * cases where it cannot be determined if the effect is synchronous or
 * asynchronous until the side-effect is actually executed. The effect also
 * has the option of returning a canceler, which will be used by the runtime
 * to cancel the asynchronous effect if the fiber executing the effect is
 * interrupted.
 *
 * If the register function returns a value synchronously, then the callback
 * function must not be called. Otherwise the callback function must be called
 * at most once.
 *
 * The list of fibers, that may complete the async callback, is used to
 * provide better diagnostics.
 */
export const maybeAsyncInterrupt = <R, E, A>(
   register: (cb: (resolve: Effect<R, E, A>) => void) => Either<Canceler<R>, Effect<R, E, A>>,
   blockingOn: ReadonlyArray<FiberId> = []
): Effect<R, E, A> =>
   chain_(
      total(() => [new AtomicReference(false), new OneShot<Canceler<R>>()] as const),
      ([started, cancel]) =>
         onInterrupt_(
            flatten(
               asyncOption<R, E, Effect<R, E, A>>((k) => {
                  started.set(true);
                  const ret = new AtomicReference<Option<UIO<Effect<R, E, A>>>>(none());
                  try {
                     const res = register((io) => k(pure(io)));
                     switch (res._tag) {
                        case "Right": {
                           ret.set(some(pure(res.right)));
                           break;
                        }
                        case "Left": {
                           cancel.set(res.left);
                           break;
                        }
                     }
                  } finally {
                     if (!cancel.isSet()) {
                        cancel.set(unit);
                     }
                  }
                  return ret.get;
               }, blockingOn)
            ),
            () => suspend(() => (started.get ? cancel.get() : unit))
         )
   );

export const asyncInterrupt = <R, E, A>(
   register: (cb: (_: Effect<R, E, A>) => void) => Canceler<R>,
   blockingOn: ReadonlyArray<FiberId> = []
) => maybeAsyncInterrupt<R, E, A>((cb) => left(register(cb)), blockingOn);

/**
 * Returns a effect that will never produce anything. The moral equivalent of
 * `while(true) {}`, only without the wasted CPU cycles.
 */
export const never = suspend(() =>
   asyncInterrupt<unknown, never, never>(() => {
      const interval = setInterval(() => {
         //
      }, 60000);
      return total(() => {
         clearInterval(interval);
      });
   })
);
