import * as A from "../../../Array";
import * as E from "../../../Either";
import { pipe } from "../../../Function";
import * as O from "../../../Option";
import * as M from "../../Managed";
import * as T from "../../Task";
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
      M.mapBoth(that.push, (pushLeft, pushRight) =>
        O.fold(
          () =>
            pipe(
              pushLeft(O.none()),
              T.chain((cl) =>
                cl.length === 0
                  ? pushRight(O.none())
                  : pipe(pushRight(O.some(cl)), T.mapBoth(pushRight(O.none()), A.concat_))
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
      M.mapBoth_(me.push, that.push, (pushMe, pushThat) => (is: O.Option<ReadonlyArray<I>>) =>
        O.fold_(
          is,
          () =>
            pipe(
              pushMe(O.none()),
              T.mapError((e) => [E.left<E | E1>(e), A.empty<L>()] as const),
              T.chain((chunk) => T.andThen_(pushThat(O.some(chunk)), pushThat(O.none())))
            ),
          (in_) =>
            pipe(
              pushMe(O.some(in_)),
              T.mapError((e) => [E.left(e), A.empty<L>()] as const),
              T.chain((chunk) => pushThat(O.some(chunk)))
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
