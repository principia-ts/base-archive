import { flow } from "@principia/prelude";

import * as E from "../../../Either";
import * as Ex from "../../Exit";
import type { Cause } from "../../Exit/Cause";
import * as C from "../../Exit/Cause";
import * as T from "../_core";
import type { AIO } from "../model";
import { bracketExit_ } from "./bracket";

export function onTermination_<R, E, A, R1>(
  aio: AIO<R, E, A>,
  onTerminated: (cause: Cause<never>) => T.RIO<R1, any>
): AIO<R & R1, E, A> {
  return bracketExit_(
    T.unit(),
    () => aio,
    (_, exit) =>
      Ex.fold_(
        exit,
        flow(
          C.failureOrCause,
          E.fold(() => T.unit(), onTerminated)
        ),
        () => T.unit()
      )
  );
}

export function onTermination<R1>(
  onTerminated: (cause: Cause<never>) => T.RIO<R1, any>
): <R, E, A>(aio: T.AIO<R, E, A>) => T.AIO<R & R1, E, A> {
  return (aio) => onTermination_(aio, onTerminated);
}
