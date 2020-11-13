import { flow } from "@principia/prelude";

import * as T from "../_core";
import * as E from "../../../Either";
import * as Ex from "../../Exit";
import type { Cause } from "../../Exit/Cause";
import * as C from "../../Exit/Cause";
import type { Task } from "../model";
import { bracketExit_ } from "./bracket";

export function onTermination_<R, E, A, R1>(
   task: Task<R, E, A>,
   onTerminated: (cause: Cause<never>) => T.RIO<R1, any>
): Task<R & R1, E, A> {
   return bracketExit_(
      T.unit(),
      () => task,
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
): <R, E, A>(task: T.Task<R, E, A>) => T.Task<R & R1, E, A> {
   return (task) => onTermination_(task, onTerminated);
}
