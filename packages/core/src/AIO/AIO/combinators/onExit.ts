import type { Exit } from "../../Exit";
import { unit } from "../_core";
import type { AIO } from "../model";
import { bracketExit_ } from "./bracket";

export function onExit_<R, E, A, R2, E2>(
  self: AIO<R, E, A>,
  cleanup: (exit: Exit<E, A>) => AIO<R2, E2, any>
): AIO<R & R2, E | E2, A> {
  return bracketExit_(
    unit(),
    () => self,
    (_, e) => cleanup(e)
  );
}

export const onExit = <E, A, R2, E2>(cleanup: (exit: Exit<E, A>) => AIO<R2, E2, any>) => <R>(
  self: AIO<R, E, A>
): AIO<R & R2, E | E2, A> => onExit_(self, cleanup);
