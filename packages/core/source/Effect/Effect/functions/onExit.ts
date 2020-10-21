import type { Exit } from "../../Exit";
import { unit } from "../core";
import type { Effect } from "../model";
import { bracketExit_ } from "./bracket";

export function onExit_<R, E, A, R2, E2>(
   self: Effect<R, E, A>,
   cleanup: (exit: Exit<E, A>) => Effect<R2, E2, any>
): Effect<R & R2, E | E2, A> {
   return bracketExit_(
      unit,
      () => self,
      (_, e) => cleanup(e)
   );
}

export const onExit = <E, A, R2, E2>(cleanup: (exit: Exit<E, A>) => Effect<R2, E2, any>) => <R>(
   self: Effect<R, E, A>
): Effect<R & R2, E | E2, A> => onExit_(self, cleanup);
