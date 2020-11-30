import { supervised_ } from "../../IO/combinators/supervised";
import type { RuntimeFiber } from "../../IO/Fiber/model";
import { track } from "../../IO/Supervisor";
import * as I from "../_internal/io";
import { Managed } from "../model";
import { unwrap } from "./unwrap";

/**
 * Locally installs a supervisor and an effect that succeeds with all the
 * children that have been forked in the returned effect.
 */
export function withChildren<R, E, A>(
  get: (_: I.UIO<ReadonlyArray<RuntimeFiber<any, any>>>) => Managed<R, E, A>
): Managed<R, E, A> {
  return unwrap(
    I.map_(
      track,
      (supervisor) =>
        new Managed(
          supervised_(
            get(
              I.chain_(supervisor.value, (children) =>
                I.map_(I.descriptor(), (d) => children.filter((_) => _.id !== d.id))
              )
            ).io,
            supervisor
          )
        )
    )
  );
}
