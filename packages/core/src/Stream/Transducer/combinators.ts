import type { Chunk } from "../../Chunk";
import * as C from "../../Chunk";
import * as E from "../../Either";
import { pipe } from "../../Function";
import * as I from "../../IO";
import * as M from "../../Managed";
import * as O from "../../Option";
import { Sink } from "../Sink";
import { Transducer } from "./model";

/**
 * Compose this tansducer with another transducer, resulting in a composite transducer.
 */
export function then_<R, E, I, O, R1, E1, O1>(
  self: Transducer<R, E, I, O>,
  that: Transducer<R1, E1, O, O1>
): Transducer<R & R1, E | E1, I, O1> {
  return new Transducer(
    pipe(
      self.push,
      M.zipWith(that.push, (pushLeft, pushRight) =>
        O.fold(
          () =>
            pipe(
              pushLeft(O.none()),
              I.chain((cl) =>
                cl.length === 0
                  ? pushRight(O.none())
                  : pipe(pushRight(O.some(cl)), I.zipWith(pushRight(O.none()), C.concat_))
              )
            ),
          (inputs) =>
            pipe(
              pushLeft(O.some(inputs)),
              I.chain((cl) => pushRight(O.some(cl)))
            )
        )
      )
    )
  );
}

/**
 * Compose this tansducer with another transducer, resulting in a composite transducer.
 */
export function then<R1, E1, O, O1>(
  that: Transducer<R1, E1, O, O1>
): <R, E, I>(self: Transducer<R, E, I, O>) => Transducer<R & R1, E1 | E, I, O1> {
  return (me) => then_(me, that);
}

/**
 * Compose this transducer with a sink, resulting in a sink that processes elements by piping
 * them through this transducer and piping the results into the sink.
 */
export function thenSink_<R, E, I, O, R1, E1, L, Z>(
  me: Transducer<R, E, I, O>,
  that: Sink<R1, E1, O, L, Z>
): Sink<R & R1, E | E1, I, L, Z> {
  return new Sink(
    pipe(
      M.zipWith_(me.push, that.push, (pushMe, pushThat) => (is: O.Option<Chunk<I>>) =>
        O.fold_(
          is,
          () =>
            pipe(
              pushMe(O.none()),
              I.mapError((e) => [E.left<E | E1>(e), C.empty<L>()] as const),
              I.chain((chunk) => I.andThen_(pushThat(O.some(chunk)), pushThat(O.none())))
            ),
          (in_) =>
            pipe(
              pushMe(O.some(in_)),
              I.mapError((e) => [E.left(e), C.empty<L>()] as const),
              I.chain((chunk) => pushThat(O.some(chunk)))
            )
        )
      )
    )
  );
}

/**
 * Compose this transducer with a sink, resulting in a sink that processes elements by piping
 * them through this transducer and piping the results into the sink.
 */
export function thenSink<R1, E1, O, L, Z>(
  that: Sink<R1, E1, O, L, Z>
): <R, E, I>(me: Transducer<R, E, I, O>) => Sink<R & R1, E | E1, I, L, Z> {
  return (me) => thenSink_(me, that);
}
