import * as E from "../../Either";
import { pipe } from "../../Function";
import * as O from "../../Option";
import * as C from "../Exit/Cause";
import * as M from "../Managed";
import * as T from "../Task";
import type { Stream } from "./model";
import * as Sink from "./Sink";

/**
 * Runs the sink on the stream to produce either the sink's result or an error.
 */
export function runManaged_<R, E, A, R1, E1, B>(
   stream: Stream<R, E, A>,
   sink: Sink.Sink<R1, E1, A, any, B>
): M.Managed<R & R1, E1 | E, B> {
   return pipe(
      M.both_(stream.proc, sink.push),
      M.mapM(([pull, push]) => {
         const go: T.Task<R1 & R, E1 | E, B> = T.foldCauseM_(
            pull,
            (c): T.Task<R1, E1 | E, B> =>
               pipe(
                  C.sequenceCauseOption(c),
                  O.fold(
                     () =>
                        T.foldCauseM_(
                           push(O.none()),
                           (c) =>
                              pipe(
                                 c,
                                 C.map(([_]) => _),
                                 C.sequenceCauseEither,
                                 E.fold(T.halt, T.pure)
                              ),
                           () => T.die("empty stream / empty sinks")
                        ),
                     T.halt
                  )
               ),
            (os) =>
               T.foldCauseM_(
                  push(O.some(os)),
                  (c): T.Task<unknown, E1, B> =>
                     pipe(
                        c,
                        C.map(([_]) => _),
                        C.sequenceCauseEither,
                        E.fold(T.halt, T.pure)
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
export function run_<R, E, A, R1, E1, B>(stream: Stream<R, E, A>, sink: Sink.Sink<R1, E1, A, any, B>) {
   return M.useNow(runManaged_(stream, sink));
}

/**
 * Runs the sink on the stream to produce either the sink's result or an error.
 */
export function run<A, R1, E1, B>(
   sink: Sink.Sink<R1, E1, A, any, B>
): <R, E>(stream: Stream<R, E, A>) => T.Task<R & R1, E1 | E, B> {
   return (stream) => run_(stream, sink);
}

export function runCollect<R, E, A>(stream: Stream<R, E, A>): T.Task<R, E, readonly A[]> {
   return run_(stream, Sink.collectAll<A>());
}

/**
 * Runs the stream and collects all of its elements to an array.
 */
export function runDrain<R, E, A>(stream: Stream<R, E, A>): T.Task<R, E, void> {
   return pipe(
      stream,
      foreach((_) => T.unit())
   );
}

/**
 * Consumes all elements of the stream, passing them to the specified callback.
 */
export function foreach_<R, E, A, R1, E1, B>(
   stream: Stream<R, E, A>,
   f: (a: A) => T.Task<R1, E1, B>
): T.Task<R & R1, E | E1, void> {
   return run_(stream, Sink.fromForeach(f));
}

/**
 * Consumes all elements of the stream, passing them to the specified callback.
 */
export function foreach<A, R1, E1, B>(
   f: (a: A) => T.Task<R1, E1, B>
): <R, E>(stream: Stream<R, E, A>) => T.Task<R & R1, E1 | E, void> {
   return (stream) => foreach_(stream, f);
}

/**
 * Like `foreach`, but returns a `Managed` so the finalization order
 * can be controlled.
 */
export function foreachManaged_<R, E, A, R1, E1, B>(
   stream: Stream<R, E, A>,
   f: (a: A) => T.Task<R1, E1, B>
): M.Managed<R & R1, E | E1, void> {
   return runManaged_(stream, Sink.fromForeach(f));
}

/**
 * Like `foreach`, but returns a `Managed` so the finalization order
 * can be controlled.
 */
export function foreachManaged<A, R1, E1, B>(
   f: (a: A) => T.Task<R1, E1, B>
): <R, E>(stream: Stream<R, E, A>) => M.Managed<R & R1, E1 | E, void> {
   return (stream) => foreachManaged_(stream, f);
}
