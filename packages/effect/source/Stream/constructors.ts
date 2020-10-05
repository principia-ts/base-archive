import * as A from "@principia/core/Array";
import { Either } from "@principia/core/Either";
import * as E from "@principia/core/Either";
import { flow, pipe } from "@principia/core/Function";
import { Maybe } from "@principia/core/Maybe";
import * as Mb from "@principia/core/Maybe";

import * as C from "../Cause";
import * as T from "../Effect";
import { sequential } from "../ExecutionStrategy";
import { Exit } from "../Exit";
import * as M from "../Managed";
import { XQueue } from "../XQueue";
import * as XQ from "../XQueue";
import * as XR from "../XRef";
import * as Pull from "./internal/Pull";
import * as Take from "./internal/Take";
import { Transducer } from "./internal/Transducer";
import { IO, Stream, UIO } from "./Stream";

/**
 * Creates a stream from an array of values
 */
export const fromArray = <A>(c: ReadonlyArray<A>): UIO<A> =>
   new Stream(
      pipe(
         XR.makeRef(false),
         T.chain(
            XR.modify<T.IO<Maybe<never>, ReadonlyArray<A>>, boolean>((done) =>
               done || c.length === 0 ? [Pull.end, true] : [T.pure(c), true]
            )
         ),
         T.toManaged()
      )
   );

/**
 * Creates a stream from an effect producing a value of type `A` or an empty Stream
 */
export const fromEffectMaybe = <R, E, A>(fa: T.Effect<R, Maybe<E>, A>): Stream<R, E, A> =>
   new Stream(
      pipe(
         M.of,
         M.bindS("doneRef", () => pipe(XR.makeRef(false), T.toManaged())),
         M.letS("pull", ({ doneRef }) =>
            pipe(
               doneRef,
               XR.modify((b) =>
                  b
                     ? [Pull.end, true]
                     : [
                          pipe(
                             fa,
                             T.map((a) => [a])
                          ),
                          true
                       ]
               ),
               T.flatten
            )
         ),
         M.map(({ pull }) => pull)
      )
   );

/**
 * Creates a stream from an effect producing a value of type `A`
 */
export const fromEffect = <R, E, A>(ef: T.Effect<R, E, A>): Stream<R, E, A> =>
   pipe(ef, T.first(Mb.just), fromEffectMaybe);

/**
 * Creates a stream from an asynchronous callback that can be called multiple times.
 * The registration of the callback can possibly return the stream synchronously.
 * The optionality of the error type `E` can be used to signal the end of the stream,
 * by setting it to `None`.
 */
export const asyncMaybe = <R, E, A>(
   register: (
      resolve: (
         next: T.Effect<R, Maybe<E>, ReadonlyArray<A>>,
         offerCb?: (e: Exit<never, boolean>) => void
      ) => T.UIO<Exit<never, boolean>>
   ) => Maybe<Stream<R, E, A>>,
   outputBuffer = 16
): Stream<R, E, A> =>
   new Stream(
      pipe(
         M.of,
         M.bindS("output", () =>
            pipe(XQ.makeBounded<Take.Take<E, A>>(outputBuffer), T.toManaged())
         ),
         M.bindS("runtime", () => pipe(T.runtime<R>(), T.toManaged())),
         M.bindS("maybeStream", ({ output, runtime }) =>
            M.total(() =>
               register((k, cb) =>
                  pipe(Take.fromPull(k), T.chain(output.offer), (x) => runtime.runCancel(x, cb))
               )
            )
         ),
         M.bindS("pull", ({ maybeStream, output }) =>
            Mb._fold(
               maybeStream,
               () =>
                  pipe(
                     M.of,
                     M.bindS("done", () => XR.makeManagedRef(false)),
                     M.map(({ done }) =>
                        pipe(
                           done.get,
                           T.chain((b) =>
                              b
                                 ? Pull.end
                                 : pipe(
                                      output.take,
                                      T.chain(Take.done),
                                      T.onError(() =>
                                         pipe(
                                            done.set(true),
                                            T.chain(() => output.shutdown)
                                         )
                                      )
                                   )
                           )
                        )
                     )
                  ),
               (s) =>
                  pipe(
                     output.shutdown,
                     T.toManaged(),
                     M.chain(() => s.proc)
                  )
            )
         ),
         M.map(({ pull }) => pull)
      )
   );

/**
 * Creates a stream from an asynchronous callback that can be called multiple times.
 * The optionality of the error type `E` can be used to signal the end of the stream,
 * by setting it to `None`.
 */
export const async = <R, E, A>(
   register: (
      resolve: (
         next: T.Effect<R, Maybe<E>, ReadonlyArray<A>>,
         offerCb?: (e: Exit<never, boolean>) => void
      ) => T.UIO<Exit<never, boolean>>
   ) => void,
   outputBuffer = 16
): Stream<R, E, A> =>
   asyncMaybe((cb) => {
      register(cb);
      return Mb.nothing();
   }, outputBuffer);

/**
 * Creates a stream from an asynchronous callback that can be called multiple times.
 * The registration of the callback returns either a canceler or synchronously returns a stream.
 * The optionality of the error type `E` can be used to signal the end of the stream, by
 * setting it to `None`.
 */
export const asyncInterruptEither = <R, E, A>(
   register: (
      resolve: (
         next: T.Effect<R, Maybe<E>, ReadonlyArray<A>>,
         offerCb?: (e: Exit<never, boolean>) => void
      ) => T.UIO<Exit<never, boolean>>
   ) => Either<T.Canceler<R>, Stream<R, E, A>>,
   outputBuffer = 16
): Stream<R, E, A> =>
   new Stream(
      pipe(
         M.of,
         M.bindS("output", () =>
            pipe(XQ.makeBounded<Take.Take<E, A>>(outputBuffer), T.toManaged())
         ),
         M.bindS("runtime", () => pipe(T.runtime<R>(), T.toManaged())),
         M.bindS("eitherStream", ({ output, runtime }) =>
            M.total(() =>
               register((k, cb) =>
                  pipe(Take.fromPull(k), T.chain(output.offer), (x) => runtime.runCancel(x, cb))
               )
            )
         ),
         M.bindS("pull", ({ eitherStream, output }) =>
            E._fold(
               eitherStream,
               (canceler) =>
                  pipe(
                     M.of,
                     M.bindS("done", () => XR.makeManagedRef(false)),
                     M.map(({ done }) =>
                        pipe(
                           done.get,
                           T.chain((b) =>
                              b
                                 ? Pull.end
                                 : pipe(
                                      output.take,
                                      T.chain(Take.done),
                                      T.onError(() =>
                                         pipe(
                                            done.set(true),
                                            T.chain(() => output.shutdown)
                                         )
                                      )
                                   )
                           )
                        )
                     ),
                     M.ensuring(canceler)
                  ),
               (s) =>
                  pipe(
                     output.shutdown,
                     T.toManaged(),
                     M.chain(() => s.proc)
                  )
            )
         ),
         M.map(({ pull }) => pull)
      )
   );

/**
 * Creates a stream from an asynchronous callback that can be called multiple times.
 * The registration of the callback returns either a canceler or synchronously returns a stream.
 * The optionality of the error type `E` can be used to signal the end of the stream, by
 * setting it to `None`.
 */
export const asyncInterrupt = <R, E, A>(
   register: (
      cb: (
         next: T.Effect<R, Maybe<E>, ReadonlyArray<A>>,
         offerCb?: (e: Exit<never, boolean>) => void
      ) => T.UIO<Exit<never, boolean>>
   ) => T.Canceler<R>,
   outputBuffer = 16
): Stream<R, E, A> => asyncInterruptEither((cb) => E.left(register(cb)), outputBuffer);

export const fail = <E>(e: E): IO<E, never> => fromEffect(T.fail(e));

/**
 * Creates a stream from an effect producing chunks of `A` values until it fails with None.
 */
export const repeatEffectChunkMaybe = <R, E, A>(
   ef: T.Effect<R, Maybe<E>, ReadonlyArray<A>>
): Stream<R, E, A> =>
   new Stream(
      pipe(
         M.of,
         M.bindS("done", () => XR.makeManagedRef(false)),
         M.letS("pull", ({ done }) =>
            pipe(
               done.get,
               T.chain((b) =>
                  b
                     ? Pull.end
                     : pipe(
                          ef,
                          T.tapError(
                             Mb.fold(
                                () => done.set(true),
                                () => T.unit
                             )
                          )
                       )
               )
            )
         ),
         M.map(({ pull }) => pull)
      )
   );

/**
 * Creates a stream from an effect producing values of type `A` until it fails with None.
 */
export const repeatEffectOption: <R, E, A>(fa: T.Effect<R, Maybe<E>, A>) => Stream<R, E, A> = flow(
   T.map(A.pure),
   repeatEffectChunkMaybe
);

/**
 * Creates a stream from an `XQueue` of values
 */
export const fromArrayXQueue = <R, E, O>(
   queue: XQueue<never, R, unknown, E, never, Array<O>>
): Stream<R, E, O> =>
   repeatEffectChunkMaybe(
      T._catchAllCause(queue.take, (c) =>
         T._chain(queue.isShutdown, (down) => (down && C.isInterrupt(c) ? Pull.end : Pull.halt(c)))
      )
   );

const _ensuringFirst = <R, E, A, R1>(
   stream: Stream<R, E, A>,
   finalizer: T.Effect<R1, never, unknown>
) => new Stream(M._ensuringFirst(stream.proc, finalizer));

/**
 * Creates a stream from an `XQueue` of values. The queue will be shutdown once the stream is closed.
 */
export const fromArrayXQueueWithShutdown = <R, E, A>(
   queue: XQueue<never, R, unknown, E, never, Array<A>>
): Stream<R, E, A> => _ensuringFirst(fromArrayXQueue(queue), queue.shutdown);

/**
 * Creates a stream from an `XQueue` of values
 */
export const fromXQueue = <R, E, A>(
   queue: XQueue<never, R, unknown, E, never, A>
): Stream<R, E, A> =>
   pipe(
      queue,
      XQ.takeBetween(1, Number.MAX_SAFE_INTEGER),
      T.catchAllCause((c) =>
         T._chain(queue.isShutdown, (down) => (down && C.isInterrupt(c) ? Pull.end : Pull.halt(c)))
      ),
      repeatEffectChunkMaybe
   );

/**
 * Creates a stream from an `XQueue` of values. The queue will be shutdown once the stream is closed.
 */
export const fromXQueueWithShutdown = <R, E, A>(
   queue: XQueue<never, R, unknown, E, never, A>
): Stream<R, E, A> => _ensuringFirst(fromXQueue(queue), queue.shutdown);

/**
 * The `Stream` that dies with the error.
 */
export const die = (e: unknown): UIO<never> => fromEffect(T.die(e));

/**
 * The stream that dies with an exception described by `message`.
 */
export const dieMessage = (message: string) => fromEffect(T.dieMessage(message));

/**
 * The infinite stream of iterative function application: a, f(a), f(f(a)), f(f(f(a))), ...
 */
export const iterate = <A>(a: A, f: (a: A) => A): UIO<A> =>
   new Stream(pipe(XR.makeRef(a), T.toManaged(), M.map(flow(XR.getAndUpdate(f), T.map(A.pure)))));

/**
 * Creates a single-valued stream from a managed resource
 */
export const managed = <R, E, A>(ma: M.Managed<R, E, A>): Stream<R, E, A> =>
   new Stream(
      pipe(
         M.of,
         M.bindS("doneRef", () => XR.makeManagedRef(false)),
         M.bindS("finalizer", () => M.makeManagedReleaseMap(sequential())),
         M.letS("pull", ({ doneRef, finalizer }) =>
            T.uninterruptibleMask(({ restore }) =>
               pipe(
                  doneRef.get,
                  T.chain((done) =>
                     done
                        ? Pull.end
                        : pipe(
                             T.of,
                             T.bindS("a", () =>
                                pipe(
                                   ma.effect,
                                   T.map(([_, __]) => __),
                                   T.provideSome((r: R) => [r, finalizer] as [R, M.ReleaseMap]),
                                   restore,
                                   T.onError(() => doneRef.set(true))
                                )
                             ),
                             T.chainFirst(() => doneRef.set(true)),
                             T.map(({ a }) => [a]),
                             T.first(Mb.just)
                          )
                  )
               )
            )
         ),
         M.map(({ pull }) => pull)
      )
   );

/**
 * Applies an aggregator to the stream, which converts one or more elements
 * of type `A` into elements of type `B`.
 */
export const _aggregate = <R, E, A, R1, E1, B>(
   stream: Stream<R, E, A>,
   transducer: Transducer<R1, E1, A, B>
) =>
   new Stream<R & R1, E | E1, B>(
      pipe(
         M.of,
         M.bindS("pull", () => stream.proc),
         M.bindS("push", () => transducer.push),
         M.bindS("done", () => XR.makeManagedRef(false)),
         M.letS("run", ({ done, pull, push }) =>
            pipe(
               done.get,
               T.chain((b) =>
                  b
                     ? Pull.end
                     : pipe(
                          pull,
                          T.foldM(
                             Mb.fold(
                                () =>
                                   pipe(
                                      done.set(true),
                                      T.chain(() => pipe(push(Mb.nothing()), T.asJustError))
                                   ),
                                (e) => Pull.fail<E | E1>(e)
                             ),
                             (os) => pipe(push(Mb.just(os)), T.asJustError)
                          )
                       )
               )
            )
         ),
         M.map(({ run }) => run)
      )
   );

/**
 * Applies an aggregator to the stream, which converts one or more elements
 * of type `A` into elements of type `B`.
 */
export const aggregate = <A, R1, E1, B>(transducer: Transducer<R1, E1, A, B>) => <R, E>(
   stream: Stream<R, E, A>
) => _aggregate(stream, transducer);

/**
 * Creates a new `Stream` from a managed effect that yields chunks.
 * The effect will be evaluated repeatedly until it fails with a `None`
 * (to signify stream end) or a `Some<E>` (to signify stream failure).
 *
 * The stream evaluation guarantees proper acquisition and release of the
 * `Managed`.
 */
export const apply = <R, E, A>(
   proc: M.Managed<R, never, T.Effect<R, Maybe<E>, ReadonlyArray<A>>>
) => new Stream(proc);

/**
 * Creates a stream from a single value that will get cleaned up after the
 * stream is consumed
 */
export const _bracket = <R, E, A, R1>(
   acquire: T.Effect<R, E, A>,
   release: (a: A) => T.Effect<R1, never, any>
) => managed(M._make(acquire, release));

/**
 * Creates a stream from a single value that will get cleaned up after the
 * stream is consumed
 */
export const bracket = <A, R1>(release: (a: A) => T.Effect<R1, never, any>) => <R, E>(
   acquire: T.Effect<R, E, A>
) => _bracket(acquire, release);

/**
 * Creates a stream from a single value that will get cleaned up after the
 * stream is consumed
 */
export const _bracketExit = <R, E, A, R1>(
   acquire: T.Effect<R, E, A>,
   release: (a: A, exit: Exit<unknown, unknown>) => T.Effect<R1, never, unknown>
) => managed(M._makeExit(acquire, release));

/**
 * Creates a stream from a single value that will get cleaned up after the
 * stream is consumed
 */
export const bracketExit = <A, R1>(
   release: (a: A, exit: Exit<unknown, unknown>) => T.Effect<R1, never, unknown>
) => <R, E>(acquire: T.Effect<R, E, A>) => _bracketExit(acquire, release);
