import { pipe } from "@principia/core/Function";
import type { Option } from "@principia/core/Option";
import * as O from "@principia/core/Option";

import * as T from "../../Effect";
import * as M from "../../Managed";

// Contract notes for transducers:
// - When a None is received, the transducer must flush all of its internal state
//   and remain empty until subsequent Some(Chunk) values.
//
//   Stated differently, after a first push(None), all subsequent push(None) must
//   result in empty [].
export class Transducer<R, E, I, O> {
   constructor(readonly push: M.Managed<R, never, (c: Option<ReadonlyArray<I>>) => T.Effect<R, E, ReadonlyArray<O>>>) {}
}

/**
 * Contract notes for transducers:
 * - When a None is received, the transducer must flush all of its internal state
 *   and remain empty until subsequent Some(Chunk) values.
 *
 *   Stated differently, after a first push(None), all subsequent push(None) must
 *   result in empty [].
 */
export const transducer = <R, E, I, O, R1>(
   push: M.Managed<R, never, (c: Option<ReadonlyArray<I>>) => T.Effect<R1, E, ReadonlyArray<O>>>
) => new Transducer<R & R1, E, I, O>(push);

/**
 * Compose this tansducer with another transducer, resulting in a composite transducer.
 */
export const then = <R1, E1, O, O1>(that: Transducer<R1, E1, O, O1>) => <R, E, I>(
   self: Transducer<R, E, I, O>
): Transducer<R & R1, E1 | E, I, O1> =>
   transducer(
      pipe(
         self.push,
         M.mapBoth(that.push, (pushLeft, pushRight) =>
            O.fold(
               () =>
                  pipe(
                     pushLeft(O.none()),
                     T.chain((cl) =>
                        cl.length === 0
                           ? pushRight(O.none())
                           : pipe(
                                pushRight(O.some(cl)),
                                T.mapBoth(pushRight(O.none()), (a, b) => [...a, ...b])
                             )
                     )
                  ),
               (inputs) =>
                  pipe(
                     pushLeft(O.some(inputs)),
                     T.chain((cl) => pushRight(O.some(cl)))
                  )
            )
         )
      )
   );
