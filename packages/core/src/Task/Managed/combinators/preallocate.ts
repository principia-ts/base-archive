import { pipe } from "@principia/prelude";

import * as T from "../_internal/task";
import { tuple } from "../../../Function";
import { sequential } from "../../ExecutionStrategy";
import * as Ex from "../../Exit";
import { Managed } from "../model";
import * as RM from "../ReleaseMap";
import { releaseAll } from "./releaseAll";

/**
 * Preallocates the managed resource, resulting in a Managed that reserves
 * and acquires immediately and cannot fail. You should take care that you
 * are not interrupted between running preallocate and actually acquiring
 * the resource as you might leak otherwise.
 */
export function preallocate<R, E, A>(
  ma: Managed<R, E, A>
): T.Task<R, E, Managed<unknown, never, A>> {
  return T.uninterruptibleMask(({ restore }) =>
    pipe(
      T.do,
      T.bindS("releaseMap", () => RM.make),
      T.bindS("tp", ({ releaseMap }) =>
        pipe(
          ma.task,
          T.gives((r: R) => tuple(r, releaseMap)),
          restore,
          T.result
        )
      ),
      T.bindS("preallocated", ({ releaseMap, tp }) =>
        Ex.foldM_(
          tp,
          (c) => pipe(releaseMap, releaseAll(Ex.failure(c), sequential), T.apSecond(T.halt(c))),
          ([release, a]) =>
            T.succeed(
              new Managed(
                T.asksM(([_, releaseMap]: readonly [unknown, RM.ReleaseMap]) =>
                  pipe(
                    releaseMap,
                    RM.add(release),
                    T.map((_) => tuple(_, a))
                  )
                )
              )
            )
        )
      ),
      T.map(({ preallocated }) => preallocated)
    )
  );
}

/**
 * Preallocates the managed resource inside an outer Managed, resulting in a
 * Managed that reserves and acquires immediately and cannot fail.
 */
export function preallocateManaged<R, E, A>(
  ma: Managed<R, E, A>
): Managed<R, E, Managed<unknown, never, A>> {
  return new Managed(
    T.map_(ma.task, ([release, a]) => [
      release,
      new Managed(
        T.asksM(([_, releaseMap]: readonly [unknown, RM.ReleaseMap]) =>
          pipe(
            releaseMap,
            RM.add(release),
            T.map((_) => tuple(_, a))
          )
        )
      )
    ])
  );
}
