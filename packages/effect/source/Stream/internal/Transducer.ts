import { pipe } from "@principia/core/Function";
import * as Mb from "@principia/core/Maybe";
import { Maybe } from "@principia/core/Maybe";

import * as T from "../../Effect";
import * as M from "../../Managed";

// Contract notes for transducers:
// - When a None is received, the transducer must flush all of its internal state
//   and remain empty until subsequent Some(Chunk) values.
//
//   Stated differently, after a first push(None), all subsequent push(None) must
//   result in empty [].
export class Transducer<R, E, I, O> {
   constructor(
      readonly push: M.Managed<
         R,
         never,
         (c: Maybe<ReadonlyArray<I>>) => T.Effect<R, E, ReadonlyArray<O>>
      >
   ) {}
}

/**
 * Contract notes for transducers:
 * - When a None is received, the transducer must flush all of its internal state
 *   and remain empty until subsequent Some(Chunk) values.
 *
 *   Stated differently, after a first push(None), all subsequent push(None) must
 *   result in empty [].
 */
export const transducer = <R, E, I, O, X1, R1>(
   push: M.Managed<R, never, (c: Maybe<ReadonlyArray<I>>) => T.Effect<R1, E, ReadonlyArray<O>>>
) => new Transducer<R & R1, E, I, O>(push);

/**
 * Compose this tansducer with another transducer, resulting in a composite transducer.
 */
export const then = <X1, R1, E1, O, O1>(that: Transducer<R1, E1, O, O1>) => <R, E, I>(
   self: Transducer<R, E, I, O>
): Transducer<R & R1, E1 | E, I, O1> =>
   transducer(
      pipe(
         self.push,
         M.mapBoth(that.push, (pushLeft, pushRight) =>
            Mb.fold(
               () =>
                  pipe(
                     pushLeft(Mb.nothing()),
                     T.chain((cl) =>
                        cl.length === 0
                           ? pushRight(Mb.nothing())
                           : pipe(
                                pushRight(Mb.just(cl)),
                                T.mapBoth(pushRight(Mb.nothing()), (a, b) => [...a, ...b])
                             )
                     )
                  ),
               (inputs) =>
                  pipe(
                     pushLeft(Mb.just(inputs)),
                     T.chain((cl) => pushRight(Mb.just(cl)))
                  )
            )
         )
      )
   );
