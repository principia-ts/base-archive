import * as A from "../../Array";
import type { Either } from "../../Either";
import * as E from "../../Either";
import { flow, pipe } from "../../Function";
import type { Option } from "../../Option";
import * as O from "../../Option";
import { sequential } from "../ExecutionStrategy";
import type { Exit } from "../Exit";
import * as C from "../Exit/Cause";
import * as M from "../Managed";
import * as T from "../Task";
import type { XQueue } from "../XQueue";
import * as XQ from "../XQueue";
import * as XR from "../XRef";
import * as Pull from "./internal/Pull";
import * as Take from "./internal/Take";
import type { Transducer } from "./internal/Transducer";
import type { EIO, IO, RIO } from "./model";
import { Stream } from "./model";

/**
 * Creates a stream from an array of values
 */
export const fromArray = <A>(c: ReadonlyArray<A>): IO<A> =>
   new Stream(
      pipe(
         T.do,
         T.bindS("doneRef", () => XR.makeRef(false)),
         T.letS("pull", ({ doneRef }) =>
            pipe(
               doneRef,
               XR.modify<T.EIO<Option<never>, ReadonlyArray<A>>, boolean>((done) =>
                  done || c.length === 0 ? [Pull.end, true] : [T.pure(c), true]
               ),
               T.flatten
            )
         ),
         T.map(({ pull }) => pull),
         T.toManaged()
      )
   );

/**
 * Creates a stream from a task producing a value of type `A` or an empty Stream
 */
export const fromTaskOption = <R, E, A>(fa: T.Task<R, Option<E>, A>): Stream<R, E, A> =>
   new Stream(
      pipe(
         M.do,
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
 * Creates a stream from a task producing a value of type `A`
 */
export const fromTask = <R, E, A>(ef: T.Task<R, E, A>): Stream<R, E, A> => pipe(ef, T.first(O.some), fromTaskOption);

/**
 * Creates a stream from an asynchronous callback that can be called multiple times.
 * The registration of the callback can possibly return the stream synchronously.
 * The optionality of the error type `E` can be used to signal the end of the stream,
 * by setting it to `None`.
 */
export const asyncOption = <R, E, A>(
   register: (
      resolve: (
         next: T.Task<R, Option<E>, ReadonlyArray<A>>,
         offerCb?: (e: Exit<never, boolean>) => void
      ) => T.IO<Exit<never, boolean>>
   ) => Option<Stream<R, E, A>>,
   outputBuffer = 16
): Stream<R, E, A> =>
   new Stream(
      pipe(
         M.do,
         M.bindS("output", () => pipe(XQ.makeBounded<Take.Take<E, A>>(outputBuffer), T.toManaged())),
         M.bindS("runtime", () => pipe(T.runtime<R>(), T.toManaged())),
         M.bindS("maybeStream", ({ output, runtime }) =>
            M.total(() =>
               register((k, cb) => pipe(Take.fromPull(k), T.chain(output.offer), (x) => runtime.runCancel(x, cb)))
            )
         ),
         M.bindS("pull", ({ maybeStream, output }) =>
            O.fold_(
               maybeStream,
               () =>
                  pipe(
                     M.do,
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
         next: T.Task<R, Option<E>, ReadonlyArray<A>>,
         offerCb?: (e: Exit<never, boolean>) => void
      ) => T.IO<Exit<never, boolean>>
   ) => void,
   outputBuffer = 16
): Stream<R, E, A> =>
   asyncOption((cb) => {
      register(cb);
      return O.none();
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
         next: T.Task<R, Option<E>, ReadonlyArray<A>>,
         offerCb?: (e: Exit<never, boolean>) => void
      ) => T.IO<Exit<never, boolean>>
   ) => Either<T.Canceler<R>, Stream<R, E, A>>,
   outputBuffer = 16
): Stream<R, E, A> =>
   new Stream(
      pipe(
         M.do,
         M.bindS("output", () => pipe(XQ.makeBounded<Take.Take<E, A>>(outputBuffer), T.toManaged())),
         M.bindS("runtime", () => pipe(T.runtime<R>(), T.toManaged())),
         M.bindS("eitherStream", ({ output, runtime }) =>
            M.total(() =>
               register((k, cb) => pipe(Take.fromPull(k), T.chain(output.offer), (x) => runtime.runCancel(x, cb)))
            )
         ),
         M.bindS("pull", ({ eitherStream, output }) =>
            E.fold_(
               eitherStream,
               (canceler) =>
                  pipe(
                     M.do,
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
         next: T.Task<R, Option<E>, ReadonlyArray<A>>,
         offerCb?: (e: Exit<never, boolean>) => void
      ) => T.IO<Exit<never, boolean>>
   ) => T.Canceler<R>,
   outputBuffer = 16
): Stream<R, E, A> => asyncInterruptEither((cb) => E.left(register(cb)), outputBuffer);

export const fail = <E>(e: E): EIO<E, never> => fromTask(T.fail(e));

/**
 * Creates a stream from a task producing chunks of `A` values until it fails with None.
 */
export const repeatTaskChunkOption = <R, E, A>(ef: T.Task<R, Option<E>, ReadonlyArray<A>>): Stream<R, E, A> =>
   new Stream(
      pipe(
         M.do,
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
                             O.fold(
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

const ensuringFirst_ = <R, E, A, R1>(stream: Stream<R, E, A>, finalizer: T.Task<R1, never, unknown>) =>
   new Stream(M.ensuringFirst_(stream.proc, finalizer));

/**
 * Creates a stream from a task producing values of type `A` until it fails with None.
 */
export const repeatTaskOption: <R, E, A>(fa: T.Task<R, Option<E>, A>) => Stream<R, E, A> = flow(
   T.map(A.pure),
   repeatTaskChunkOption
);

/**
 * Creates a stream from an `XQueue` of values
 */
export const fromArrayXQueue = <R, E, O>(queue: XQueue<never, R, unknown, E, never, Array<O>>): Stream<R, E, O> =>
   repeatTaskChunkOption(
      T.catchAllCause_(queue.take, (c) =>
         T.chain_(queue.isShutdown, (down) => (down && C.isInterrupt(c) ? Pull.end : Pull.halt(c)))
      )
   );

/**
 * Creates a stream from an `XQueue` of values. The queue will be shutdown once the stream is closed.
 */
export const fromArrayXQueueWithShutdown = <R, E, A>(
   queue: XQueue<never, R, unknown, E, never, Array<A>>
): Stream<R, E, A> => ensuringFirst_(fromArrayXQueue(queue), queue.shutdown);

/**
 * Creates a stream from an `XQueue` of values
 */
export const fromXQueue = <R, E, A>(queue: XQueue<never, R, unknown, E, never, A>): Stream<R, E, A> =>
   pipe(
      queue,
      XQ.takeBetween(1, Number.MAX_SAFE_INTEGER),
      T.catchAllCause((c) =>
         T.chain_(queue.isShutdown, (down) => (down && C.isInterrupt(c) ? Pull.end : Pull.halt(c)))
      ),
      repeatTaskChunkOption
   );

/**
 * Creates a stream from an `XQueue` of values. The queue will be shutdown once the stream is closed.
 */
export const fromXQueueWithShutdown = <R, E, A>(queue: XQueue<never, R, unknown, E, never, A>): Stream<R, E, A> =>
   ensuringFirst_(fromXQueue(queue), queue.shutdown);

/**
 * The `Stream` that dies with the error.
 */
export const die = (e: unknown): IO<never> => fromTask(T.die(e));

/**
 * The stream that dies with an exception described by `message`.
 */
export const dieMessage = (message: string) => fromTask(T.dieMessage(message));

/**
 * The empty stream
 */
export const empty: IO<never> = new Stream(M.pure(Pull.end));

/**
 * The infinite stream of iterative function application: a, f(a), f(f(a)), f(f(f(a))), ...
 */
export const iterate = <A>(a: A, f: (a: A) => A): IO<A> =>
   new Stream(pipe(XR.makeRef(a), T.toManaged(), M.map(flow(XR.getAndUpdate(f), T.map(A.pure)))));

export const suspend = <R, E, A>(thunk: () => Stream<R, E, A>): Stream<R, E, A> =>
   new Stream(M.suspend(() => thunk().proc));

/**
 * Creates a single-valued stream from a managed resource
 */
export const managed = <R, E, A>(ma: M.Managed<R, E, A>): Stream<R, E, A> =>
   new Stream(
      pipe(
         M.do,
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
                             T.do,
                             T.bindS("a", () =>
                                pipe(
                                   ma.task,
                                   T.map(([_, __]) => __),
                                   T.local((r: R) => [r, finalizer] as [R, M.ReleaseMap]),
                                   restore,
                                   T.onError(() => doneRef.set(true))
                                )
                             ),
                             T.tap(() => doneRef.set(true)),
                             T.map(({ a }) => [a]),
                             T.first(O.some)
                          )
                  )
               )
            )
         ),
         M.map(({ pull }) => pull)
      )
   );

/**
 * Creates a one-element stream that never fails and executes the finalizer when it ends.
 */
export const finalizer = <R>(finalizer: T.RIO<R, unknown>): RIO<R, unknown> => bracket((_) => finalizer)(T.unit);

/**
 * Applies an aggregator to the stream, which converts one or more elements
 * of type `A` into elements of type `B`.
 */
export const aggregate_ = <R, E, A, R1, E1, B>(stream: Stream<R, E, A>, transducer: Transducer<R1, E1, A, B>) =>
   new Stream<R & R1, E | E1, B>(
      pipe(
         M.do,
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
                             O.fold(
                                () =>
                                   pipe(
                                      done.set(true),
                                      T.chain(() => pipe(push(O.none()), T.asSomeError))
                                   ),
                                (e) => Pull.fail<E | E1>(e)
                             ),
                             (os) => pipe(push(O.some(os)), T.asSomeError)
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
export const aggregate = <A, R1, E1, B>(transducer: Transducer<R1, E1, A, B>) => <R, E>(stream: Stream<R, E, A>) =>
   aggregate_(stream, transducer);

/**
 * Creates a new `Stream` from a managed effect that yields chunks.
 * The effect will be evaluated repeatedly until it fails with a `None`
 * (to signify stream end) or a `Some<E>` (to signify stream failure).
 *
 * The stream evaluation guarantees proper acquisition and release of the
 * `Managed`.
 */
export const apply = <R, E, A>(proc: M.Managed<R, never, T.Task<R, Option<E>, ReadonlyArray<A>>>) => new Stream(proc);

/**
 * Creates a stream from a single value that will get cleaned up after the
 * stream is consumed
 */
export const bracket_ = <R, E, A, R1>(acquire: T.Task<R, E, A>, release: (a: A) => T.Task<R1, never, any>) =>
   managed(M.make_(acquire, release));

/**
 * Creates a stream from a single value that will get cleaned up after the
 * stream is consumed
 */
export const bracket = <A, R1>(release: (a: A) => T.Task<R1, never, any>) => <R, E>(acquire: T.Task<R, E, A>) =>
   bracket_(acquire, release);

/**
 * Creates a stream from a single value that will get cleaned up after the
 * stream is consumed
 */
export const bracketExit_ = <R, E, A, R1>(
   acquire: T.Task<R, E, A>,
   release: (a: A, exit: Exit<unknown, unknown>) => T.Task<R1, never, unknown>
) => managed(M.makeExit_(acquire, release));

/**
 * Creates a stream from a single value that will get cleaned up after the
 * stream is consumed
 */
export const bracketExit = <A, R1>(release: (a: A, exit: Exit<unknown, unknown>) => T.Task<R1, never, unknown>) => <
   R,
   E
>(
   acquire: T.Task<R, E, A>
) => bracketExit_(acquire, release);
