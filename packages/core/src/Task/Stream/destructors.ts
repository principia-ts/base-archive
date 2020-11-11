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
export const runManaged_ = <R, E, A, R1, E1, B>(
   stream: Stream<R, E, A>,
   sink: Sink.Sink<R1, E1, A, any, B>
): M.Managed<R & R1, E1 | E, B> =>
   pipe(
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

/**
 * Runs the sink on the stream to produce either the sink's result or an error.
 */
export const runManaged = <A, R1, E1, B>(sink: Sink.Sink<R1, E1, A, any, B>) => <R, E>(stream: Stream<R, E, A>) =>
   runManaged_(stream, sink);

/**
 * Runs the sink on the stream to produce either the sink's result or an error.
 */
export const run_ = <R, E, A, R1, E1, B>(stream: Stream<R, E, A>, sink: Sink.Sink<R1, E1, A, any, B>) =>
   M.useNow(runManaged_(stream, sink));

/**
 * Runs the sink on the stream to produce either the sink's result or an error.
 */
export const run = <A, R1, E1, B>(sink: Sink.Sink<R1, E1, A, any, B>) => <R, E>(stream: Stream<R, E, A>) =>
   run_(stream, sink);

export const runCollect = <R, E, A>(stream: Stream<R, E, A>) => run_(stream, Sink.collectAll<A>());

/**
 * Runs the stream and collects all of its elements to an array.
 */
export const runDrain = <R, E, A>(stream: Stream<R, E, A>): T.Task<R, E, void> =>
   pipe(
      stream,
      foreach((_) => T.unit())
   );

/**
 * Consumes all elements of the stream, passing them to the specified callback.
 */
export const foreach_ = <R, E, A, R1, E1, B>(stream: Stream<R, E, A>, f: (a: A) => T.Task<R1, E1, B>) =>
   run_(stream, Sink.fromForeach(f));

/**
 * Consumes all elements of the stream, passing them to the specified callback.
 */
export const foreach = <A, R1, E1, B>(f: (a: A) => T.Task<R1, E1, B>) => <R, E>(stream: Stream<R, E, A>) =>
   foreach_(stream, f);

/**
 * Like `foreach`, but returns a `Managed` so the finalization order
 * can be controlled.
 */
export const foreachManaged_ = <R, E, A, R1, E1, B>(stream: Stream<R, E, A>, f: (a: A) => T.Task<R1, E1, B>) =>
   runManaged_(stream, Sink.fromForeach(f));

/**
 * Like `foreach`, but returns a `Managed` so the finalization order
 * can be controlled.
 */
export const foreachManaged = <A, R1, E1, B>(f: (a: A) => T.Task<R1, E1, B>) => <R, E>(stream: Stream<R, E, A>) =>
   foreachManaged_(stream, f);
