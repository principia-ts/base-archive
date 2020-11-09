import * as T from "../_internal/task";
import type { RuntimeFiber } from "../../Fiber/model";
import { track } from "../../Supervisor";
import { supervised_ } from "../../Task";
import { Managed } from "../model";
import { unwrap } from "./unwrap";

/**
 * Locally installs a supervisor and an effect that succeeds with all the
 * children that have been forked in the returned effect.
 */
export const withChildren = <R, E, A>(
   get: (_: T.IO<ReadonlyArray<RuntimeFiber<any, any>>>) => Managed<R, E, A>
): Managed<R, E, A> =>
   unwrap(
      T.map_(
         track,
         (supervisor) =>
            new Managed(
               supervised_(
                  get(
                     T.chain_(supervisor.value, (children) =>
                        T.map_(T.descriptor(), (d) => children.filter((_) => _.id !== d.id))
                     )
                  ).task,
                  supervisor
               )
            )
      )
   );
