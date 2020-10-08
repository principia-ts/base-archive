import * as E from "@principia/core/Either";
import { pipe } from "@principia/core/Function";
import * as O from "@principia/core/Option";

import * as C from "../Cause";
import * as T from "../Effect";
import * as M from "../Managed";
import * as Sink from "./internal/Sink";
import type { Stream } from "./Stream";

/**
 * Runs the sink on the stream to produce either the sink's result or an error.
 */
export const runManaged_ = <R, E, A, R1, E1, B>(
   stream: Stream<R, E, A>,
   sink: Sink.Sink<R1, E1, A, any, B>
): M.Managed<R & R1, E1 | E, B> =>
   pipe(
      M.both_(stream.proc, sink.push),
      M.mapEffect(([pull, push]) => {
         const go: T.Effect<R1 & R, E1 | E, B> = T.foldCauseM_(
            pull,
            (c): T.Effect<R1, E1 | E, B> =>
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
                  (c): T.Effect<unknown, E1, B> =>
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

export const runManaged = <A, R1, E1, B>(sink: Sink.Sink<R1, E1, A, any, B>) => <R, E>(stream: Stream<R, E, A>) =>
   runManaged_(stream, sink);

export const run_ = <R, E, A, R1, E1, B>(stream: Stream<R, E, A>, sink: Sink.Sink<R1, E1, A, any, B>) =>
   M.useNow(runManaged_(stream, sink));

export const run = <A, R1, E1, B>(sink: Sink.Sink<R1, E1, A, any, B>) => <R, E>(stream: Stream<R, E, A>) =>
   run_(stream, sink);

export const runCollect = <R, E, A>(stream: Stream<R, E, A>) => run_(stream, Sink.collectAll<A>());

export const foreach_ = <R, E, A, R1, E1, B>(stream: Stream<R, E, A>, f: (a: A) => T.Effect<R1, E1, B>) =>
   run_(stream, Sink.foreach(f));

export const foreach = <A, R1, E1, B>(f: (a: A) => T.Effect<R1, E1, B>) => <R, E>(stream: Stream<R, E, A>) =>
   foreach_(stream, f);

export const foreachManaged_ = <R, E, A, R1, E1, B>(stream: Stream<R, E, A>, f: (a: A) => T.Effect<R1, E1, B>) =>
   runManaged_(stream, Sink.foreach(f));

export const foreachManaged = <A, R1, E1, B>(f: (a: A) => T.Effect<R1, E1, B>) => <R, E>(stream: Stream<R, E, A>) =>
   foreachManaged_(stream, f);
