import * as C from "../Task/Exit/Cause";
import { halt, succeed } from "./constructors";
import { foldCauseM_ } from "./fold";
import { fork } from "./fork";
import { CheckInterruptibleInstruction, InterruptStatusInstruction } from "./internal/Concrete";
import { InterruptStatus } from "./internal/InterruptStatus";
import { join } from "./join";
import { chain_ } from "./methods";
import type { Async } from "./model";

export const setInterruptStatus_ = <R, E, A>(task: Async<R, E, A>, flag: InterruptStatus): Async<R, E, A> =>
   new InterruptStatusInstruction(task, flag);

export const makeInterruptible = <R, E, A>(task: Async<R, E, A>): Async<R, E, A> =>
   setInterruptStatus_(task, new InterruptStatus(true));

export const makeUninterruptible = <R, E, A>(task: Async<R, E, A>): Async<R, E, A> =>
   setInterruptStatus_(task, new InterruptStatus(false));

export const checkInterruptible = <R, E, A>(f: (status: InterruptStatus) => Async<R, E, A>) =>
   new CheckInterruptibleInstruction(f);

export const uninterruptibleMask = <R, E, A>(f: (restore: InterruptStatusRestore) => Async<R, E, A>): Async<R, E, A> =>
   checkInterruptible((status) => makeUninterruptible(f(new InterruptStatusRestore(status))));

export const disconnect = <R, E, A>(task: Async<R, E, A>): Async<R, E, A> =>
   uninterruptibleMask(({ restore }) =>
      chain_(fork(restore(task)), (driver) => onInterrupt_(restore(join(driver)), () => fork(driver.interrupt())))
   );

export const onInterrupt_ = <R, E, A, R1>(
   task: Async<R, E, A>,
   cleanup: () => Async<R1, never, any>
): Async<R & R1, E, A> =>
   uninterruptibleMask(({ restore }) =>
      foldCauseM_(
         restore(task),
         (cause) => (C.isInterrupt(cause) ? chain_(cleanup(), () => halt(cause)) : halt(cause)),
         succeed
      )
   );

export class InterruptStatusRestore {
   constructor(readonly flag: InterruptStatus) {
      this.restore = this.restore.bind(this);
      this.force = this.force.bind(this);
   }
   restore<R, E, A>(task: Async<R, E, A>): Async<R, E, A> {
      return setInterruptStatus_(task, this.flag);
   }
   force<R, E, A>(task: Async<R, E, A>): Async<R, E, A> {
      if (this.flag.isUninterruptible) {
         return makeInterruptible(disconnect(makeUninterruptible(task)));
      }
      return setInterruptStatus_(task, this.flag);
   }
}
