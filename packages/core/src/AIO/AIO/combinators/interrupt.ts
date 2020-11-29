import { flow, pipe } from "@principia/prelude";

import type { Either } from "../../../Either";
import { left } from "../../../Either";
import type { Option } from "../../../Option";
import { none, some } from "../../../Option";
import { AtomicReference } from "../../../Utils/support/AtomicReference";
import { OneShot } from "../../../Utils/support/OneShot";
import * as C from "../../Exit/Cause";
import { join } from "../../Fiber/combinators/join";
import type { FiberId } from "../../Fiber/FiberId";
import type { InterruptStatus } from "../../Fiber/model";
import { interruptible, uninterruptible } from "../../Fiber/model";
import {
  async,
  asyncOption,
  chain,
  chain_,
  checkInterruptible,
  die,
  flatten,
  foldCauseM_,
  halt,
  pure,
  suspend,
  total,
  unit
} from "../_core";
import type { AIO, Canceler, EIO, IO } from "../model";
import { SetInterruptInstruction } from "../model";
import { forkDaemon } from "./core-scope";
import { fiberId } from "./fiberId";

export function interruptAs(fiberId: FiberId): EIO<never, never> {
  return halt(C.interrupt(fiberId));
}

export const interrupt: AIO<unknown, never, never> = chain_(fiberId(), interruptAs);

export function setInterruptStatus_<R, E, A>(
  effect: AIO<R, E, A>,
  flag: InterruptStatus
): AIO<R, E, A> {
  return new SetInterruptInstruction(effect, flag);
}

export function setInterruptStatus(
  flag: InterruptStatus
): <R, E, A>(ma: AIO<R, E, A>) => AIO<R, E, A> {
  return (ma) => setInterruptStatus_(ma, flag);
}

export function makeInterruptible<R, E, A>(ma: AIO<R, E, A>): AIO<R, E, A> {
  return setInterruptStatus_(ma, interruptible);
}

export function makeUninterruptible<R, E, A>(ma: AIO<R, E, A>): AIO<R, E, A> {
  return setInterruptStatus_(ma, uninterruptible);
}

/**
 * Makes the effect uninterruptible, but passes it a restore function that
 * can be used to restore the inherited interruptibility from whatever region
 * the effect is composed into.
 */
export function uninterruptibleMask<R, E, A>(
  f: (restore: InterruptStatusRestore) => AIO<R, E, A>
): AIO<R, E, A> {
  return checkInterruptible((flag) => makeUninterruptible(f(new InterruptStatusRestoreImpl(flag))));
}

/**
 * Calls the specified function, and runs the effect it returns, if this
 * effect is interrupted.
 */
export function onInterrupt_<R, E, A, R1>(
  ma: AIO<R, E, A>,
  cleanup: (interruptors: ReadonlySet<FiberId>) => AIO<R1, never, any>
): AIO<R & R1, E, A> {
  return uninterruptibleMask(({ restore }) =>
    foldCauseM_(
      restore(ma),
      (cause) =>
        C.interrupted(cause)
          ? chain_(cleanup(C.interruptors(cause)), () => halt(cause))
          : halt(cause),
      pure
    )
  );
}

export function onInterrupt<R1>(
  cleanup: (interruptors: ReadonlySet<FiberId>) => AIO<R1, never, any>
): <R, E, A>(ma: AIO<R, E, A>) => AIO<R & R1, E, A> {
  return (ma) => onInterrupt_(ma, cleanup);
}

/**
 * Calls the specified function, and runs the effect it returns, if this
 * effect is interrupted (allows for expanding error).
 */
export function onInterruptExtended_<R, E, A, R2, E2>(
  self: AIO<R, E, A>,
  cleanup: () => AIO<R2, E2, any>
) {
  return uninterruptibleMask(({ restore }) =>
    foldCauseM_(
      restore(self),
      (cause) =>
        C.interrupted(cause)
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
 * Returns an AIO whose interruption will be disconnected from the
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
export function disconnect<R, E, A>(effect: AIO<R, E, A>): AIO<R, E, A> {
  return uninterruptibleMask(({ restore }) =>
    chain_(fiberId(), (id) =>
      chain_(forkDaemon(restore(effect)), (fiber) =>
        onInterrupt_(restore(join(fiber)), () => forkDaemon(fiber.interruptAs(id)))
      )
    )
  );
}

/**
 * Used to restore the inherited interruptibility
 */
export interface InterruptStatusRestore {
  readonly restore: <R, E, A>(effect: AIO<R, E, A>) => AIO<R, E, A>;
  readonly force: <R, E, A>(effect: AIO<R, E, A>) => AIO<R, E, A>;
}

export class InterruptStatusRestoreImpl implements InterruptStatusRestore {
  constructor(readonly flag: InterruptStatus) {
    this.restore = this.restore.bind(this);
    this.force = this.force.bind(this);
  }

  restore<R, E, A>(ma: AIO<R, E, A>): AIO<R, E, A> {
    return setInterruptStatus_(ma, this.flag);
  }

  force<R, E, A>(ma: AIO<R, E, A>): AIO<R, E, A> {
    if (this.flag.isUninteruptible) {
      return makeInterruptible(disconnect(makeUninterruptible(ma)));
    }
    return setInterruptStatus_(ma, this.flag);
  }
}

/**
 * Imports an asynchronous side-effect into an AIO. The side-effect
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
export function maybeAsyncInterrupt<R, E, A>(
  register: (cb: (resolve: AIO<R, E, A>) => void) => Either<Canceler<R>, AIO<R, E, A>>,
  blockingOn: ReadonlyArray<FiberId> = []
): AIO<R, E, A> {
  return pipe(
    total(() => [new AtomicReference(false), new OneShot<Canceler<R>>()] as const),
    chain(([started, cancel]) =>
      pipe(
        asyncOption<R, E, AIO<R, E, A>>((k) => {
          started.set(true);
          const ret = new AtomicReference<Option<IO<AIO<R, E, A>>>>(none());
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
}

export function asyncInterrupt<R, E, A>(
  register: (cb: (_: AIO<R, E, A>) => void) => Canceler<R>,
  blockingOn: ReadonlyArray<FiberId> = []
): AIO<R, E, A> {
  return maybeAsyncInterrupt<R, E, A>((cb) => left(register(cb)), blockingOn);
}

export function promiseInterrupt<R, E, A>(
  register: (cb: (_: AIO<R, E, A>) => void) => Promise<Canceler<R>>,
  blockingOn: ReadonlyArray<FiberId> = []
): AIO<R, E, A> {
  return maybeAsyncInterrupt<R, E, A>(
    (cb) => left(pipe(register(cb), (p) => fromPromiseDie(() => p), flatten)),
    blockingOn
  );
}

function fromPromiseDie<A>(promise: () => Promise<A>): IO<A> {
  return async((resolve) => {
    promise().then(flow(pure, resolve)).catch(flow(die, resolve));
  });
}
