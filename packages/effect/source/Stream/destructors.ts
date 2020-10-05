import * as E from "@principia/core/Either";
import { pipe } from "@principia/core/Function";
import * as Mb from "@principia/core/Maybe";

import * as C from "../Cause";
import * as T from "../Effect";
import * as M from "../Managed";
import * as Sink from "./internal/Sink";
import { Stream } from "./Stream";

/**
 * Runs the sink on the stream to produce either the sink's result or an error.
 */
export const _runManaged = <R, E, A, R1, E1, B>(
   stream: Stream<R, E, A>,
   sink: Sink.Sink<R1, E1, A, any, B>
): M.Managed<R & R1, E1 | E, B> =>
   pipe(
      M._both(stream.proc, sink.push),
      M.mapEffect(([pull, push]) => {
         const go: T.Effect<R1 & R, E1 | E, B> = T._foldCauseM(
            pull,
            (c): T.Effect<R1, E1 | E, B> =>
               pipe(
                  C.sequenceCauseMaybe(c),
                  Mb.fold(
                     () =>
                        T._foldCauseM(
                           push(Mb.nothing()),
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
               T._foldCauseM(
                  push(Mb.just(os)),
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

export const runManaged = <A, R1, E1, B>(sink: Sink.Sink<R1, E1, A, any, B>) => <R, E>(
   stream: Stream<R, E, A>
) => _runManaged(stream, sink);

export const _run = <R, E, A, R1, E1, B>(
   stream: Stream<R, E, A>,
   sink: Sink.Sink<R1, E1, A, any, B>
) => M.useNow(_runManaged(stream, sink));

export const run = <A, R1, E1, B>(sink: Sink.Sink<R1, E1, A, any, B>) => <R, E>(
   stream: Stream<R, E, A>
) => _run(stream, sink);

export const runCollect = <R, E, A>(stream: Stream<R, E, A>) => _run(stream, Sink.collectAll<A>());

export const _foreach = <R, E, A, R1, E1, B>(
   stream: Stream<R, E, A>,
   f: (a: A) => T.Effect<R1, E1, B>
) => _run(stream, Sink.foreach(f));

export const foreach = <A, R1, E1, B>(f: (a: A) => T.Effect<R1, E1, B>) => <R, E>(
   stream: Stream<R, E, A>
) => _foreach(stream, f);

export const _foreachManaged = <R, E, A, R1, E1, B>(
   stream: Stream<R, E, A>,
   f: (a: A) => T.Effect<R1, E1, B>
) => _runManaged(stream, Sink.foreach(f));

export const foreachManaged = <A, R1, E1, B>(f: (a: A) => T.Effect<R1, E1, B>) => <R, E>(
   stream: Stream<R, E, A>
) => _foreachManaged(stream, f);
