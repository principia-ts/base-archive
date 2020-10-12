import { pipe } from "@principia/core/Function";

import type { RuntimeFiber } from "../../Fiber";
import * as Supervisor from "../../Supervisor";
import { chain } from "../core";
import type { Effect } from "../Effect";
import { ensuring } from "./bracket";
import { supervised } from "./supervised";

/**
 * Acts on the children of this fiber, guaranteeing the specified callback
 * will be invoked, whether or not this effect succeeds.
 *
 * @category Combinators
 * @since 1.0.0
 */
export const _ensuringChildren = <R, E, A, R1>(
   fa: Effect<R, E, A>,
   children: (_: ReadonlyArray<RuntimeFiber<any, any>>) => Effect<R1, never, any>
) =>
   pipe(
      Supervisor.track,
      chain((s) =>
         pipe(
            fa,
            supervised(s),
            ensuring(
               pipe(
                  s.value,
                  chain((v) => children(v))
               )
            )
         )
      )
   );

/**
 * Acts on the children of this fiber, guaranteeing the specified callback
 * will be invoked, whether or not this effect succeeds.
 *
 * @category Combinators
 * @since 1.0.0
 */
export const ensuringChildren = <R1>(
   children: (_: ReadonlyArray<RuntimeFiber<any, any>>) => Effect<R1, never, any>
) => <R, E, A>(fa: Effect<R, E, A>) => _ensuringChildren(fa, children);
