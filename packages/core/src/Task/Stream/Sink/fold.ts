import * as E from "../../../Either";
import { pipe } from "../../../Function";
import type { Option } from "../../../Option";
import * as O from "../../../Option";
import * as Tu from "../../../Tuple";
import * as M from "../../Managed";
import * as T from "../../Task";
import * as XR from "../../XRef";
import type * as Push from "../internal/Push";
import { Sink } from "./model";

export function foldM_<R, E, I, L, Z, R1, E1, L1, Z1>(
   sz: Sink<R, E, I, L, Z>,
   onFailure: (e: E) => Sink<R1, E1, I, L1, Z1>,
   onSuccess: (z: Z) => Sink<R1, E1, I, L1, Z1>
): Sink<R & R1, E1, I, L1, Z1> {
   return new Sink(
      M.gen(function* (_) {
         const switched = yield* _(XR.makeRef(false));
         const thisPush = yield* _(sz.push);
         const thatPush = yield* _(
            XR.makeRef<Push.Push<R1, E1, I, L1, Z1>>((_) => T.unit())
         );
         const openThatPush = yield* _(M.switchable<R1, never, Push.Push<R1, E1, I, L1, Z1>>());
         return (in_: Option<ReadonlyArray<I>>) =>
            T.chain_(switched.get, (sw) => {
               if (!sw) {
                  return T.catchAll_(thisPush(in_), (v) => {
                     const leftover = (Tu.snd(v) as unknown) as ReadonlyArray<I>;
                     const nextSink = E.fold_(Tu.fst(v), onFailure, onSuccess);
                     return pipe(
                        openThatPush(nextSink.push),
                        T.tap(thatPush.set),
                        T.chain((p) =>
                           pipe(
                              switched.set(true),
                              T.apSecond(
                                 O.fold_(
                                    in_,
                                    () =>
                                       pipe(
                                          p(O.some(leftover)),
                                          T.when(() => leftover.length > 0),
                                          T.apSecond(p(O.none()))
                                       ),
                                    () =>
                                       pipe(
                                          p(O.some(leftover)),
                                          T.when(() => leftover.length > 0)
                                       )
                                 )
                              )
                           )
                        )
                     );
                  });
               } else {
                  return T.chain_(thatPush.get, (p) => p(in_));
               }
            });
      })
   );
}

export function foldM<E, I, Z, R1, E1, L1, Z1>(
   onFailure: (e: E) => Sink<R1, E1, I, L1, Z1>,
   onSuccess: (z: Z) => Sink<R1, E1, I, L1, Z1>
): <R, L>(sz: Sink<R, E, I, L, Z>) => Sink<R & R1, E1, I, L1, Z1> {
   return (sz) => foldM_(sz, onFailure, onSuccess);
}
