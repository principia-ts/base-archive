import { pipe } from "../../../Function";
import type { RuntimeFiber } from "../../Fiber";
import * as Supervisor from "../../Supervisor";
import { chain } from "../_core";
import type { AIO } from "../model";
import { ensuring } from "./bracket";
import { supervised } from "./supervised";

/**
 * Acts on the children of this fiber, guaranteeing the specified callback
 * will be invoked, whether or not this effect succeeds.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function ensuringChildren_<R, E, A, R1>(
  aio: AIO<R, E, A>,
  children: (_: ReadonlyArray<RuntimeFiber<any, any>>) => AIO<R1, never, any>
): AIO<R & R1, E, A> {
  return pipe(
    Supervisor.track,
    chain((s) =>
      pipe(
        aio,
        supervised(s),
        ensuring(
          pipe(
            s.value,
            chain((fiber) => children(fiber))
          )
        )
      )
    )
  );
}

/**
 * Acts on the children of this fiber, guaranteeing the specified callback
 * will be invoked, whether or not this effect succeeds.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function ensuringChildren<R1>(
  children: (_: ReadonlyArray<RuntimeFiber<any, any>>) => AIO<R1, never, any>
): <R, E, A>(aio: AIO<R, E, A>) => AIO<R & R1, E, A> {
  return (aio) => ensuringChildren_(aio, children);
}
