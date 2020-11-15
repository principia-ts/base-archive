import { pipe } from "@principia/prelude";

import { chain } from "../_core";
import * as A from "../../../Array/_core";
import * as O from "../../../Option";
import * as F from "../../Fiber";
import type { Scope } from "../../Scope";
import { forkDaemon } from "../core-scope";
import type { Task } from "../model";
import { onInterrupt, uninterruptibleMask } from "./interrupt";

export function in_<R, E, A>(task: Task<R, E, A>, scope: Scope<any>): Task<R, E, A> {
   return uninterruptibleMask(({ restore }) =>
      pipe(
         task,
         restore,
         forkDaemon,
         chain((executor) =>
            pipe(
               scope.extend(executor.scope),
               chain(() =>
                  pipe(
                     restore(F.join(executor)),
                     onInterrupt((interruptors) =>
                        pipe(
                           Array.from(interruptors),
                           A.head,
                           O.fold(
                              () => F.interrupt(executor),
                              (id) => executor.interruptAs(id)
                           )
                        )
                     )
                  )
               )
            )
         )
      )
   );
}

function _in(scope: Scope<any>): <R, E, A>(task: Task<R, E, A>) => Task<R, E, A> {
   return (task) => in_(task, scope);
}

export { _in as in };
