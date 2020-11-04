import { pipe } from "@principia/prelude";

import {
   asyncOption,
   chain,
   chain_,
   checkInterruptible,
   flatten,
   foldCauseM_,
   halt,
   pure,
   suspend,
   total,
   unit
} from "../_core";
import type { Either } from "../../../Either";
import { left } from "../../../Either";
import type { Option } from "../../../Option";
import { none, some } from "../../../Option";
import { AtomicReference, OneShot } from "../../../support";
import * as C from "../../Exit/Cause";
import { join } from "../../Fiber/combinators/join";
import { interruptible, uninterruptible } from "../../Fiber/core";
import type { FiberId } from "../../Fiber/FiberId";
import type { InterruptStatus } from "../../Fiber/model";
import { forkDaemon } from "../core-scope";
import type { Canceler, EIO, IO, Task } from "../model";
import { SetInterruptInstruction } from "../model";
import { checkFiberId } from "./checkFiberId";

export const interruptAs = (fiberId: FiberId): EIO<never, never> => halt(C.interrupt(fiberId));

export const interrupt: Task<unknown, never, never> = chain_(checkFiberId(), interruptAs);

export const setInterruptStatus_ = <R, E, A>(effect: Task<R, E, A>, flag: InterruptStatus): Task<R, E, A> =>
   new SetInterruptInstruction(effect, flag);

export const setInterruptStatus = (flag: InterruptStatus) => <R, E, A>(ma: Task<R, E, A>): Task<R, E, A> =>
   setInterruptStatus_(ma, flag);

export const makeInterruptible = <R, E, A>(ma: Task<R, E, A>): Task<R, E, A> => setInterruptStatus_(ma, interruptible);

export const makeUninterruptible = <R, E, A>(ma: Task<R, E, A>): Task<R, E, A> =>
   setInterruptStatus_(ma, uninterruptible);

/**
 * Makes the effect uninterruptible, but passes it a restore function that
 * can be used to restore the inherited interruptibility from whatever region
 * the effect is composed into.
 */
export const uninterruptibleMask = <R, E, A>(f: (restore: InterruptStatusRestore) => Task<R, E, A>): Task<R, E, A> =>
   checkInterruptible((flag) => makeUninterruptible(f(new InterruptStatusRestoreImpl(flag))));

/**
 * Calls the specified function, and runs the effect it returns, if this
 * effect is interrupted.
 */
export const onInterrupt_ = <R, E, A, R1>(
   ma: Task<R, E, A>,
   cleanup: (interruptors: ReadonlySet<FiberId>) => Task<R1, never, any>
): Task<R & R1, E, A> =>
   uninterruptibleMask(({ restore }) =>
      foldCauseM_(
         restore(ma),
         (cause) => (C.isInterrupt(cause) ? chain_(cleanup(C.interruptors(cause)), () => halt(cause)) : halt(cause)),
         pure
      )
   );

export const onInterrupt = <R1>(cleanup: (interruptors: ReadonlySet<FiberId>) => Task<R1, never, any>) => <R, E, A>(
   ma: Task<R, E, A>
): Task<R & R1, E, A> => onInterrupt_(ma, cleanup);

/**
 * Calls the specified function, and runs the effect it returns, if this
 * effect is interrupted (allows for expanding error).
 */
export function onInterruptExtended_<R, E, A, R2, E2>(self: Task<R, E, A>, cleanup: () => Task<R2, E2, any>) {
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
 * Returns a task whose interruption will be disconnected from the
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
export const disconnect = <R, E, A>(effect: Task<R, E, A>): Task<R, E, A> =>
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
   readonly restore: <R, E, A>(effect: Task<R, E, A>) => Task<R, E, A>;
   readonly force: <R, E, A>(effect: Task<R, E, A>) => Task<R, E, A>;
}

export class InterruptStatusRestoreImpl implements InterruptStatusRestore {
   constructor(readonly flag: InterruptStatus) {
      this.restore = this.restore.bind(this);
      this.force = this.force.bind(this);
   }

   restore<R, E, A>(ma: Task<R, E, A>): Task<R, E, A> {
      return setInterruptStatus_(ma, this.flag);
   }

   force<R, E, A>(ma: Task<R, E, A>): Task<R, E, A> {
      if (this.flag.isUninteruptible) {
         return makeInterruptible(disconnect(makeUninterruptible(ma)));
      }
      return setInterruptStatus_(ma, this.flag);
   }
}

/**
 * Imports an asynchronous side-effect into a task. The side-effect
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
   register: (cb: (resolve: Task<R, E, A>) => void) => Either<Canceler<R>, Task<R, E, A>>,
   blockingOn: ReadonlyArray<FiberId> = []
): Task<R, E, A> =>
   pipe(
      total(() => [new AtomicReference(false), new OneShot<Canceler<R>>()] as const),
      chain(([started, cancel]) =>
         pipe(
            asyncOption<R, E, Task<R, E, A>>((k) => {
               started.set(true);
               const ret = new AtomicReference<Option<IO<Task<R, E, A>>>>(none());
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
                     cancel.set(unit());
                  }
               }
               return ret.get;
            }, blockingOn),
            flatten,
            onInterrupt(() => suspend(() => (started.get ? cancel.get() : unit())))
         )
      )
   );

export const asyncInterrupt = <R, E, A>(
   register: (cb: (_: Task<R, E, A>) => void) => Canceler<R>,
   blockingOn: ReadonlyArray<FiberId> = []
) => maybeAsyncInterrupt<R, E, A>((cb) => left(register(cb)), blockingOn);
