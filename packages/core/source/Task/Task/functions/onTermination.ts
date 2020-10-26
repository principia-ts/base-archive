import { flow } from "@principia/prelude";

import * as E from "../../../Either";
import * as Ex from "../../Exit";
import type { Cause } from "../../Exit/Cause";
import * as C from "../../Exit/Cause";
import * as T from "../core";
import type { Task } from "../model";
import { bracketExit_ } from "./bracket";

export const onTermination_ = <R, E, A, R1>(
   task: Task<R, E, A>,
   onTerminated: (cause: Cause<never>) => T.RIO<R1, any>
): Task<R & R1, E, A> =>
   bracketExit_(
      T.unit,
      () => task,
      (_, exit) =>
         Ex.fold_(
            exit,
            flow(
               C.failureOrCause,
               E.fold(() => T.unit, onTerminated)
            ),
            () => T.unit
         )
   );

export const onTermination = <R1>(onTerminated: (cause: Cause<never>) => T.RIO<R1, any>) => <R, E, A>(
   task: Task<R, E, A>
): Task<R & R1, E, A> => onTermination_(task, onTerminated);
