import { pipe } from "@principia/prelude";

import type { Cause } from "../../Exit/Cause";
import * as XP from "../../XPromise";
import { apSecond, bindS, fork, map, of } from "../core";
import type { Task } from "../model";
import { catchAllCause } from "./catchAllCause";
import { uninterruptibleMask } from "./interrupt";
import { runtime } from "./runtime";
import { to } from "./to";

/**
 * Imports an asynchronous effect into an `Task`. This formulation is
 * necessary when the effect is itself expressed in terms of `Task`.
 */
export const asyncM = <R, E, R1, E1, A>(
   register: (resolve: (_: Task<R1, E1, A>) => void) => Task<R, E, any>
): Task<R & R1, E | E1, A> =>
   pipe(
      of,
      bindS("p", () => XP.make<E | E1, A>()),
      bindS("r", () => runtime<R & R1>()),
      bindS("a", ({ p, r }) =>
         uninterruptibleMask(({ restore }) =>
            pipe(
               fork(
                  restore(
                     pipe(
                        register((k) => {
                           r.run(to(p)(k));
                        }),
                        catchAllCause((c) => XP.halt(c as Cause<E | E1>)(p))
                     )
                  )
               ),
               apSecond(restore(XP.await(p)))
            )
         )
      ),
      map(({ a }) => a)
   );
