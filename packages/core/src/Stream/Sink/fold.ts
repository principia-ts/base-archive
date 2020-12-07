import type { Chunk } from "../../Chunk";
import * as E from "../../Either";
import { pipe } from "../../Function";
import * as I from "../../IO";
import * as XR from "../../IORef";
import * as M from "../../Managed";
import type { Option } from "../../Option";
import * as O from "../../Option";
import type * as Push from "../Push";
import { Sink } from "./model";

export function foldM_<R, E, I, L, Z, R1, E1, I1, L1, Z1, R2, E2, I2, L2, Z2>(
  sz: Sink<R, E, I, L, Z>,
  onFailure: (e: E) => Sink<R1, E1, I1, L1, Z1>,
  onSuccess: (z: Z) => Sink<R2, E2, I2, L2, Z2>
): Sink<R & R1 & R2, E1 | E2, I & I1 & I2, L1 | L2, Z1 | Z2> {
  return new Sink(
    pipe(
      M.do,
      M.bindS("switched", () => M.fromEffect(XR.make(false))),
      M.bindS("thisPush", () => sz.push),
      M.bindS("thatPush", () =>
        M.fromEffect(
          XR.make<Push.Push<R1 & R2, E1 | E2, I & I1 & I2, L1 | L2, Z1 | Z2>>((_) => I.unit())
        )
      ),
      M.bindS("openThatPush", () =>
        M.switchable<R1 & R2, never, Push.Push<R1 & R2, E1 | E2, I & I1 & I2, L1 | L2, Z1 | Z2>>()
      ),
      M.map(({ openThatPush, switched, thisPush, thatPush }) => (in_: Option<Chunk<I & I1 & I2>>) =>
        I.chain_(switched.get, (sw) => {
          if (!sw) {
            return I.catchAll_(thisPush(in_), (v) => {
              const leftover = v[1];
              const nextSink = E.fold_(v[0], onFailure, onSuccess);
              return pipe(
                openThatPush(nextSink.push),
                I.tap(thatPush.set),
                I.chain((p) =>
                  pipe(
                    switched.set(true),
                    I.apSecond(
                      O.fold_(
                        in_,
                        () =>
                          pipe(
                            p(O.some(leftover) as O.Option<Chunk<I & I1 & I2>>),
                            I.when(() => leftover.length > 0),
                            I.apSecond(p(O.none()))
                          ),
                        () =>
                          pipe(
                            p(O.some(leftover) as O.Option<Chunk<I & I1 & I2>>),
                            I.when(() => leftover.length > 0)
                          )
                      )
                    )
                  )
                )
              );
            });
          } else {
            return I.chain_(thatPush.get, (p) => p(in_));
          }
        })
      )
    )
  );
}

export function foldM<E, I, Z, R1, E1, I1, L1, Z1, R2, E2, I2, L2, Z2>(
  onFailure: (e: E) => Sink<R1, E1, I1, L1, Z1>,
  onSuccess: (z: Z) => Sink<R2, E2, I2, L2, Z2>
): <R, L>(sz: Sink<R, E, I, L, Z>) => Sink<R & R1 & R2, E1 | E2, I & I1 & I2, L1 | L2, Z1 | Z2> {
  return (sz) => foldM_(sz, onFailure, onSuccess);
}
