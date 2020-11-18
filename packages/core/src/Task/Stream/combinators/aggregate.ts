import * as A from "../../../Array";
import { pipe } from "../../../Function";
import * as O from "../../../Option";
import * as M from "../../Managed";
import * as T from "../../Task";
import * as XR from "../../XRef";
import * as Pull from "../internal/Pull";
import { Stream } from "../model";
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
        const go: T.Task<R & R1, O.Option<E | E1>, ReadonlyArray<P>> = pipe(
          done.get,
          T.chain((b) =>
            b
              ? Pull.end
              : pipe(
                  pull,
                  T.foldM(
                    O.fold(
                      (): T.Task<R1, O.Option<E | E1>, ReadonlyArray<P>> =>
                        T.apSecond_(done.set(true), T.asSomeError(push(O.none()))),
                      (e) => Pull.fail(e)
                    ),
                    (as) => T.asSomeError(push(O.some(as)))
                  ),
                  T.chain((ps) => (A.isEmpty(ps) ? go : T.succeed(ps)))
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
