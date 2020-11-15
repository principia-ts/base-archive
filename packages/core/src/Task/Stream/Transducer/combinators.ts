import { pipe } from "../../../Function";
import * as L from "../../../List";
import * as O from "../../../Option";
import * as M from "../../Managed";
import * as T from "../../Task";
import { Transducer } from "./model";

/**
 * Compose this tansducer with another transducer, resulting in a composite transducer.
 */
export function then<R1, E1, O, O1>(
   that: Transducer<R1, E1, O, O1>
): <R, E, I>(self: Transducer<R, E, I, O>) => Transducer<R & R1, E1 | E, I, O1> {
   return (self) =>
      new Transducer(
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
                              : pipe(pushRight(O.some(cl)), T.mapBoth(pushRight(O.none()), L.concat_))
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
}
