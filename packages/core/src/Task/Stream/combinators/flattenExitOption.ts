import { pipe } from "@principia/prelude";

import * as O from "../../../Option";
import type * as Ex from "../../Exit";
import * as M from "../../Managed";
import * as T from "../../Task";
import * as XR from "../../XRef";
import * as BPull from "../internal/BufferedPull";
import * as Pull from "../internal/Pull";
import { Stream } from "../model";

export function flattenExitOption<R, E, E1, O>(stream: Stream<R, E, Ex.Exit<O.Option<E1>, O>>): Stream<R, E | E1, O> {
   return new Stream(
      M.gen(function* (_) {
         const upstream = yield* _(M.mapM_(stream.proc, BPull.make));
         const done = yield* _(XR.makeRef(false));
         return T.chain_(done.get, (b) =>
            b
               ? Pull.end
               : T.foldM_(
                    BPull.pullElement(upstream),
                    O.fold(
                       () => T.apSecond_(done.set(true), Pull.end),
                       (e) => Pull.fail(e as E | E1)
                    ),
                    (ex) =>
                       pipe(
                          T.done(ex),
                          T.foldM(
                             O.fold(() => T.apSecond_(done.set(true), Pull.end), Pull.fail),
                             Pull.emit
                          )
                       )
                 )
         );
      })
   );
}
