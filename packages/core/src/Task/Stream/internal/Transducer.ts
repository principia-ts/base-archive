import * as A from "../../../Array";
import type { Predicate } from "../../../Function";
import { pipe } from "../../../Function";
import type { Option } from "../../../Option";
import * as O from "../../../Option";
import * as M from "../../Managed";
import * as T from "../../Task";
import * as XR from "../../XRef";

// Contract notes for transducers:
// - When a None is received, the transducer must flush all of its internal state
//   and remain empty until subsequent Some(Chunk) values.
//
//   Stated differently, after a first push(None), all subsequent push(None) must
//   result in empty [].
export class Transducer<R, E, I, O> {
   constructor(readonly push: M.Managed<R, never, (c: Option<ReadonlyArray<I>>) => T.Task<R, E, ReadonlyArray<O>>>) {}
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
   push: M.Managed<R, never, (c: Option<ReadonlyArray<I>>) => T.Task<R1, E, ReadonlyArray<O>>>
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

export const dropWhile = <I>(predicate: Predicate<I>): Transducer<unknown, never, I, I> =>
   new Transducer(
      M.gen(function* (_) {
         const dropping = yield* _(XR.makeManagedRef(true));
         return (is: O.Option<ReadonlyArray<I>>) =>
            O.fold_(
               is,
               () => T.succeed(A.empty()),
               (is) =>
                  XR.modify_(dropping, (b) => {
                     switch (b) {
                        case true: {
                           const is1 = A.dropLeftWhile_(is, predicate);
                           return [is1, is1.length === 0];
                        }
                        case false: {
                           return [is, false];
                        }
                     }
                  })
            );
      })
   );
