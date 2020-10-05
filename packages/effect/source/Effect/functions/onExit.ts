import { Exit } from "../../Exit";
import { unit } from "../core";
import { Effect } from "../Effect";
import { _bracketExit } from "./bracket";

export function _onExit<R, E, A, R2, E2>(
   self: Effect<R, E, A>,
   cleanup: (exit: Exit<E, A>) => Effect<R2, E2, any>
): Effect<R & R2, E | E2, A> {
   return _bracketExit(
      unit,
      () => self,
      (_, e) => cleanup(e)
   );
}

export const onExit = <E, A, R2, E2>(cleanup: (exit: Exit<E, A>) => Effect<R2, E2, any>) => <R>(
   self: Effect<R, E, A>
): Effect<R & R2, E | E2, A> => _onExit(self, cleanup);
