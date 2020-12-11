import type { Chunk } from "../Chunk";
import * as E from "../Either";
import { pipe } from "../Function";
import * as I from "../IO";
import * as C from "../IO/Cause";
import * as M from "../Managed";
import * as O from "../Option";
import type { Stream } from "./model";
import * as Sink from "./Sink";
import { foreachWhile, fromForeachChunk } from "./Sink";

/**
 * Runs the sink on the stream to produce either the sink's result or an error.
 */
export function runManaged_<R, E, A, R1, E1, B>(
  stream: Stream<R, E, A>,
  sink: Sink.Sink<R1, E1, A, any, B>
): M.Managed<R & R1, E1 | E, B> {
  return pipe(
    M.zip_(stream.proc, sink.push),
    M.mapM(([pull, push]) => {
      const go: I.IO<R1 & R, E1 | E, B> = I.foldCauseM_(
        pull,
        (c): I.IO<R1, E1 | E, B> =>
          pipe(
            C.sequenceCauseOption(c),
            O.fold(
              () =>
                I.foldCauseM_(
                  push(O.none()),
                  (c) =>
                    pipe(
                      c,
                      C.map(([_]) => _),
                      C.sequenceCauseEither,
                      E.fold(I.halt, I.pure)
                    ),
                  () => I.die("empty stream / empty sinks")
                ),
              I.halt
            )
          ),
        (os) =>
          I.foldCauseM_(
            push(O.some(os)),
            (c): I.IO<unknown, E1, B> =>
              pipe(
                c,
                C.map(([_]) => _),
                C.sequenceCauseEither,
                E.fold(I.halt, I.pure)
              ),
            () => go
          )
      );
      return go;
    })
  );
}

/**
 * Runs the sink on the stream to produce either the sink's result or an error.
 */
export function runManaged<A, R1, E1, B>(
  sink: Sink.Sink<R1, E1, A, any, B>
): <R, E>(stream: Stream<R, E, A>) => M.Managed<R & R1, E1 | E, B> {
  return (stream) => runManaged_(stream, sink);
}

/**
 * Runs the sink on the stream to produce either the sink's result or an error.
 */
export function run_<R, E, A, R1, E1, B>(
  stream: Stream<R, E, A>,
  sink: Sink.Sink<R1, E1, A, any, B>
) {
  return M.useNow(runManaged_(stream, sink));
}

/**
 * Runs the sink on the stream to produce either the sink's result or an error.
 */
export function run<A, R1, E1, B>(
  sink: Sink.Sink<R1, E1, A, any, B>
): <R, E>(stream: Stream<R, E, A>) => I.IO<R & R1, E1 | E, B> {
  return (stream) => run_(stream, sink);
}

export function runCollect<R, E, A>(stream: Stream<R, E, A>): I.IO<R, E, Chunk<A>> {
  return run_(stream, Sink.collectAll<A>());
}

/**
 * Runs the stream and collects all of its elements to an array.
 */
export function runDrain<R, E, A>(stream: Stream<R, E, A>): I.IO<R, E, void> {
  return pipe(
    stream,
    foreach((_) => I.unit())
  );
}

/**
 * Consumes all elements of the stream, passing them to the specified callback.
 */
export function foreach_<R, E, A, R1, E1, B>(
  stream: Stream<R, E, A>,
  f: (a: A) => I.IO<R1, E1, B>
): I.IO<R & R1, E | E1, void> {
  return run_(stream, Sink.fromForeach(f));
}

/**
 * Consumes all elements of the stream, passing them to the specified callback.
 */
export function foreach<A, R1, E1, B>(
  f: (a: A) => I.IO<R1, E1, B>
): <R, E>(stream: Stream<R, E, A>) => I.IO<R & R1, E1 | E, void> {
  return (stream) => foreach_(stream, f);
}

/**
 * Like `foreach`, but returns a `Managed` so the finalization order
 * can be controlled.
 */
export function foreachManaged_<R, E, A, R1, E1, B>(
  stream: Stream<R, E, A>,
  f: (a: A) => I.IO<R1, E1, B>
): M.Managed<R & R1, E | E1, void> {
  return runManaged_(stream, Sink.fromForeach(f));
}

/**
 * Like `foreach`, but returns a `Managed` so the finalization order
 * can be controlled.
 */
export function foreachManaged<A, R1, E1, B>(
  f: (a: A) => I.IO<R1, E1, B>
): <R, E>(stream: Stream<R, E, A>) => M.Managed<R & R1, E1 | E, void> {
  return (stream) => foreachManaged_(stream, f);
}

export function foreachChunk_<R, E, O, R1, E1, O1>(
  stream: Stream<R, E, O>,
  f: (chunk: Chunk<O>) => I.IO<R1, E1, O1>
): I.IO<R & R1, E | E1, void> {
  return run_(stream, fromForeachChunk(f));
}

export function foreachChunk<O, R1, E1, O1>(
  f: (chunk: Chunk<O>) => I.IO<R1, E1, O1>
): <R, E>(stream: Stream<R, E, O>) => I.IO<R & R1, E | E1, void> {
  return (stream) => foreachChunk_(stream, f);
}

export function foreachChunkManaged_<R, E, O, R1, E1, O1>(
  stream: Stream<R, E, O>,
  f: (chunk: Chunk<O>) => I.IO<R1, E1, O1>
): M.Managed<R & R1, E | E1, void> {
  return runManaged_(stream, fromForeachChunk(f));
}

export function foreachChunkManaged<O, R1, E1, O1>(
  f: (chunk: Chunk<O>) => I.IO<R1, E1, O1>
): <R, E>(stream: Stream<R, E, O>) => M.Managed<R & R1, E | E1, void> {
  return (stream) => foreachChunkManaged_(stream, f);
}

export function foreachWhileManaged_<R, E, O, R1, E1>(
  stream: Stream<R, E, O>,
  f: (o: O) => I.IO<R1, E1, boolean>
): M.Managed<R & R1, E | E1, void> {
  return runManaged_(stream, foreachWhile(f));
}
