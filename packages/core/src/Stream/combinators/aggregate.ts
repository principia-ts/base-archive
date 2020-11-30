import * as A from "../../Array";
import { pipe } from "../../Function";
import * as I from "../../IO";
import * as XR from "../../IORef";
import * as M from "../../Managed";
import * as O from "../../Option";
import { Stream } from "../model";
import * as Pull from "../Pull";
import type { Transducer } from "../Transducer/model";

/**
 * Applies an aggregator to the stream, which converts one or more elements
 * of type `O` into elements of type `P`.
 */
export function aggregate_<R, E, O, R1, E1, P>(
  stream: Stream<R, E, O>,
  transducer: Transducer<R1, E1, O, P>
): Stream<R & R1, E | E1, P> {
  return new Stream(
    pipe(
      M.do,
      M.bindS("pull", () => stream.proc),
      M.bindS("push", () => transducer.push),
      M.bindS("done", () => XR.makeManaged(false)),
      M.letS("go", ({ pull, push, done }) => {
        const go: I.IO<R & R1, O.Option<E | E1>, ReadonlyArray<P>> = pipe(
          done.get,
          I.chain((b) =>
            b
              ? Pull.end
              : pipe(
                  pull,
                  I.foldM(
                    O.fold(
                      (): I.IO<R1, O.Option<E | E1>, ReadonlyArray<P>> =>
                        I.apSecond_(done.set(true), I.asSomeError(push(O.none()))),
                      (e) => Pull.fail(e)
                    ),
                    (as) => I.asSomeError(push(O.some(as)))
                  ),
                  I.chain((ps) => (A.isEmpty(ps) ? go : I.succeed(ps)))
                )
          )
        );
        return go;
      }),
      M.map(({ go }) => go)
    )
  );
}

/**
 * Applies an aggregator to the stream, which converts one or more elements
 * of type `O` into elements of type `P`.
 */
export function aggregate<R1, E1, O, P>(
  transducer: Transducer<R1, E1, O, P>
): <R, E>(stream: Stream<R, E, O>) => Stream<R & R1, E1 | E, P> {
  return (stream) => aggregate_(stream, transducer);
}
