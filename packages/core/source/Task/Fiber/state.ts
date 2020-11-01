import type { Exit } from "../Exit";
import type { Cause } from "../Exit/Cause";
import * as C from "../Exit/Cause";
import type { FiberRef } from "../FiberRef";
import type { FiberStatus } from "./status";
import { Done, Running } from "./status";

export type FiberState<E, A> = FiberStateExecuting<E, A> | FiberStateDone<E, A>;

export type Callback<E, A> = (exit: Exit<E, A>) => void;

export class FiberStateExecuting<E, A> {
   readonly _tag = "Executing";

   constructor(
      readonly status: FiberStatus,
      readonly observers: Callback<never, Exit<E, A>>[],
      readonly interrupted: Cause<never>
   ) {}
}

export class FiberStateDone<E, A> {
   readonly _tag = "Done";

   readonly interrupted = C.empty;
   readonly status: FiberStatus = new Done();

   constructor(readonly value: Exit<E, A>) {}
}

export const initial = <E, A>(): FiberState<E, A> => new FiberStateExecuting(new Running(false), [], C.empty);

export const interrupting = <E, A>(state: FiberState<E, A>) => {
   const loop = (status: FiberStatus): boolean => {
      switch (status._tag) {
         case "Running": {
            return status.interrupting;
         }
         case "Finishing": {
            return status.interrupting;
         }
         case "Suspended": {
            return loop(status.previous);
         }
         case "Done": {
            return false;
         }
      }
   };

   return loop(state.status);
};
