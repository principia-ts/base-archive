import { unit } from "../_core";
import type { Cause } from "../Cause";
import type { IO } from "../model";
import { onExit_ } from "./onExit";

export const onError_ = <R, E, A, R2, E2>(
  ma: IO<R, E, A>,
  cleanup: (exit: Cause<E>) => IO<R2, E2, any>
): IO<R & R2, E | E2, A> =>
  onExit_(ma, (e) => {
    switch (e._tag) {
      case "Failure": {
        return cleanup(e.cause);
      }
      case "Success": {
        return unit();
      }
    }
  });

export const onError = <E, R2, E2>(cleanup: (exit: Cause<E>) => IO<R2, E2, any>) => <R, A>(
  ma: IO<R, E, A>
) => onError_(ma, cleanup);
