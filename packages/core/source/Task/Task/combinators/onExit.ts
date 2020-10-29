import type { Exit } from "../../Exit";
import { unit } from "../_core";
import type { Task } from "../model";
import { bracketExit_ } from "./bracket";

export function onExit_<R, E, A, R2, E2>(
   self: Task<R, E, A>,
   cleanup: (exit: Exit<E, A>) => Task<R2, E2, any>
): Task<R & R2, E | E2, A> {
   return bracketExit_(
      unit,
      () => self,
      (_, e) => cleanup(e)
   );
}

export const onExit = <E, A, R2, E2>(cleanup: (exit: Exit<E, A>) => Task<R2, E2, any>) => <R>(
   self: Task<R, E, A>
): Task<R & R2, E | E2, A> => onExit_(self, cleanup);
