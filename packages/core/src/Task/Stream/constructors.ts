import * as A from "../../Array";
import type { Either } from "../../Either";
import * as E from "../../Either";
import { flow, pipe } from "../../Function";
import type { Option } from "../../Option";
import * as O from "../../Option";
import type { HasClock } from "../Clock";
import { sequential } from "../ExecutionStrategy";
import type { Exit } from "../Exit";
import * as C from "../Exit/Cause";
import * as M from "../Managed";
import type * as RM from "../Managed/ReleaseMap";
import * as Sc from "../Schedule";
import * as T from "../Task";
import type { XQueue } from "../XQueue";
import * as XQ from "../XQueue";
import * as XR from "../XRef";
import * as Pull from "./internal/Pull";
import * as Take from "./internal/Take";
import type { EIO, IO, RIO } from "./model";
import { Stream } from "./model";
import { chain, flatten } from "./monad";

/**
 * Creates a stream from an array of values
 */
export function fromArray<A>(c: ReadonlyArray<A>): IO<A> {
   return new Stream(
      pipe(
         T.do,
         T.bindS("doneRef", () => XR.makeRef(false)),
         T.letS("pull", ({ doneRef }) =>
            pipe(
               doneRef,
               XR.modify<T.EIO<Option<never>, ReadonlyArray<A>>, boolean>((done) =>
                  done || c.length === 0 ? [Pull.end, true] : [T.pure(A.from(c)), true]
               ),
               T.flatten
            )
         ),
         T.map(({ pull }) => pull),
         T.toManaged()
      )
   );
}

/**
 * Creates a single-valued pure stream
 */
export function succeed<O>(o: O): IO<O> {
   return fromArray([o]);
}

export function fail<E>(e: E): EIO<E, never> {
   return fromTask(T.fail(e));
}

/**
 * The `Stream` that dies with the error.
 */
export function die(e: unknown): IO<never> {
   return fromTask(T.die(e));
}

/**
 * The stream that dies with an exception described by `message`.
 */
export function dieMessage(message: string): Stream<unknown, never, never> {
   return fromTask(T.dieMessage(message));
}

/**
 * The empty stream
 */
export const empty: IO<never> = new Stream(M.succeed(Pull.end));

/**
 * The infinite stream of iterative function application: a, f(a), f(f(a)), f(f(f(a))), ...
 */
export function iterate<A>(a: A, f: (a: A) => A): IO<A> {
   return new Stream(pipe(XR.makeRef(a), T.toManaged(), M.map(flow(XR.getAndUpdate(f), T.map(A.pure)))));
}

export function suspend<R, E, A>(thunk: () => Stream<R, E, A>): Stream<R, E, A> {
   return new Stream(M.suspend(() => thunk().proc));
}

/**
 * Creates a single-valued stream from a managed resource
 */
export function managed<R, E, A>(ma: M.Managed<R, E, A>): Stream<R, E, A> {
   return new Stream(
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
                                   T.gives((r: R) => [r, finalizer] as [R, RM.ReleaseMap]),
                                   restore,
                                   T.onError(() => doneRef.set(true))
                                )
                             ),
                             T.tap(() => doneRef.set(true)),
                             T.map(({ a }) => [a]),
                             T.mapError(O.some)
                          )
                  )
               )
            )
         ),
         M.map(({ pull }) => pull)
      )
   );
}

/**
 * Creates a one-element stream that never fails and executes the finalizer when it ends.
 */
export function finalizer<R>(finalizer: T.RIO<R, unknown>): RIO<R, unknown> {
   return bracket((_) => finalizer)(T.unit());
}

/**
 * Creates a stream from a task producing a value of type `A` or an empty Stream
 */
export function fromTaskOption<R, E, A>(fa: T.Task<R, Option<E>, A>): Stream<R, E, A> {
   return new Stream(
      pipe(
         M.do,
         M.bindS("doneRef", () => pipe(XR.makeRef(false), T.toManaged())),
         M.letS("pull", ({ doneRef }) =>
            pipe(
               doneRef,
               XR.modify((b) => (b ? [Pull.end, true] : [pipe(fa, T.map(A.pure)), true])),
               T.flatten
            )
         ),
         M.map(({ pull }) => pull)
      )
   );
}

/**
 * Creates a stream from a task producing a value of type `A`
 */
export function fromTask<R, E, A>(ef: T.Task<R, E, A>): Stream<R, E, A> {
   return pipe(ef, T.mapError(O.some), fromTaskOption);
}

const unwrap = <R, E, O>(fa: T.Task<R, E, Stream<R, E, O>>): Stream<R, E, O> => flatten(fromTask(fa));
/**
 * Creates a stream from a `Schedule` that does not require any further
 * input. The stream will emit an element for each value output from the
 * schedule, continuing for as long as the schedule continues.
 */
export const fromSchedule: <R, A>(schedule: Sc.Schedule<R, unknown, A>) => Stream<R & HasClock, never, A> = flow(
   Sc.driver,
   T.map((driver) => repeatTaskOption(driver.next(undefined))),
   unwrap
);

/**
 * Creates a stream from an asynchronous callback that can be called multiple times.
 * The registration of the callback can possibly return the stream synchronously.
 * The optionality of the error type `E` can be used to signal the end of the stream,
 * by setting it to `None`.
 */
export function asyncOption<R, E, A>(
   register: (
      resolve: (
         next: T.Task<R, Option<E>, ReadonlyArray<A>>,
         offerCb?: (e: Exit<never, boolean>) => void
      ) => T.IO<Exit<never, boolean>>
   ) => Option<Stream<R, E, A>>,
   outputBuffer = 16
): Stream<R, E, A> {
   return new Stream(
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
}

/**
 * Creates a stream from an asynchronous callback that can be called multiple times.
 * The optionality of the error type `E` can be used to signal the end of the stream,
 * by setting it to `None`.
 */
export function async<R, E, A>(
   register: (
      resolve: (
         next: T.Task<R, Option<E>, ReadonlyArray<A>>,
         offerCb?: (e: Exit<never, boolean>) => void
      ) => T.IO<Exit<never, boolean>>
   ) => void,
   outputBuffer = 16
): Stream<R, E, A> {
   return asyncOption((cb) => {
      register(cb);
      return O.none();
   }, outputBuffer);
}

/**
 * Creates a stream from an asynchronous callback that can be called multiple times.
 * The registration of the callback returns either a canceler or synchronously returns a stream.
 * The optionality of the error type `E` can be used to signal the end of the stream, by
 * setting it to `None`.
 */
export function asyncInterruptEither<R, E, A>(
   register: (
      resolve: (
         next: T.Task<R, Option<E>, ReadonlyArray<A>>,
         offerCb?: (e: Exit<never, boolean>) => void
      ) => T.IO<Exit<never, boolean>>
   ) => Either<T.Canceler<R>, Stream<R, E, A>>,
   outputBuffer = 16
): Stream<R, E, A> {
   return new Stream(
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
}

/**
 * Creates a stream from an asynchronous callback that can be called multiple times.
 * The registration of the callback returns either a canceler or synchronously returns a stream.
 * The optionality of the error type `E` can be used to signal the end of the stream, by
 * setting it to `None`.
 */
export function asyncInterrupt<R, E, A>(
   register: (
      cb: (
         next: T.Task<R, Option<E>, ReadonlyArray<A>>,
         offerCb?: (e: Exit<never, boolean>) => void
      ) => T.IO<Exit<never, boolean>>
   ) => T.Canceler<R>,
   outputBuffer = 16
): Stream<R, E, A> {
   return asyncInterruptEither((cb) => E.left(register(cb)), outputBuffer);
}

/**
 * Creates a stream from a task producing chunks of `A` values until it fails with None.
 */
export function repeatTaskChunkOption<R, E, A>(ef: T.Task<R, Option<E>, ReadonlyArray<A>>): Stream<R, E, A> {
   return new Stream(
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
                                () => T.unit()
                             )
                          )
                       )
               )
            )
         ),
         M.map(({ pull }) => pull)
      )
   );
}

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
export function fromArrayXQueue<R, E, O>(queue: XQueue<never, R, unknown, E, never, Array<O>>): Stream<R, E, O> {
   return repeatTaskChunkOption(
      T.catchAllCause_(T.map_(queue.take, A.from), (c) =>
         T.chain_(queue.isShutdown, (down) => (down && C.isInterrupt(c) ? Pull.end : Pull.halt(c)))
      )
   );
}

/**
 * Creates a stream from an `XQueue` of values. The queue will be shutdown once the stream is closed.
 */
export function fromArrayXQueueWithShutdown<R, E, A>(
   queue: XQueue<never, R, unknown, E, never, Array<A>>
): Stream<R, E, A> {
   return ensuringFirst_(fromArrayXQueue(queue), queue.shutdown);
}

/**
 * Creates a stream from an `XQueue` of values
 */
export function fromXQueue<R, E, A>(queue: XQueue<never, R, unknown, E, never, A>): Stream<R, E, A> {
   return pipe(
      queue,
      XQ.takeBetween(1, Number.MAX_SAFE_INTEGER),
      T.map(A.from),
      T.catchAllCause((c) =>
         T.chain_(queue.isShutdown, (down) => (down && C.isInterrupt(c) ? Pull.end : Pull.halt(c)))
      ),
      repeatTaskChunkOption
   );
}

/**
 * Creates a stream from an `XQueue` of values. The queue will be shutdown once the stream is closed.
 */
export function fromXQueueWithShutdown<R, E, A>(queue: XQueue<never, R, unknown, E, never, A>): Stream<R, E, A> {
   return ensuringFirst_(fromXQueue(queue), queue.shutdown);
}

/**
 * Creates a new `Stream` from a managed effect that yields chunks.
 * The effect will be evaluated repeatedly until it fails with a `None`
 * (to signify stream end) or a `Some<E>` (to signify stream failure).
 *
 * The stream evaluation guarantees proper acquisition and release of the
 * `Managed`.
 */
export function apply<R, E, A>(proc: M.Managed<R, never, T.Task<R, Option<E>, ReadonlyArray<A>>>): Stream<R, E, A> {
   return new Stream(proc);
}

/**
 * Creates a stream from a single value that will get cleaned up after the
 * stream is consumed
 */
export function bracket_<R, E, A, R1>(
   acquire: T.Task<R, E, A>,
   release: (a: A) => T.Task<R1, never, any>
): Stream<R & R1, E, A> {
   return managed(M.make_(acquire, release));
}

/**
 * Creates a stream from a single value that will get cleaned up after the
 * stream is consumed
 */
export function bracket<A, R1>(release: (a: A) => T.Task<R1, never, any>) {
   return <R, E>(acquire: T.Task<R, E, A>) => bracket_(acquire, release);
}

/**
 * Creates a stream from a single value that will get cleaned up after the
 * stream is consumed
 */
export function bracketExit_<R, E, A, R1>(
   acquire: T.Task<R, E, A>,
   release: (a: A, exit: Exit<unknown, unknown>) => T.Task<R1, never, unknown>
): Stream<R & R1, E, A> {
   return managed(M.makeExit_(acquire, release));
}

/**
 * Creates a stream from a single value that will get cleaned up after the
 * stream is consumed
 */
export function bracketExit<A, R1>(
   release: (a: A, exit: Exit<unknown, unknown>) => T.Task<R1, never, unknown>
): <R, E>(acquire: T.Task<R, E, A>) => Stream<R & R1, E, A> {
   return (acquire) => bracketExit_(acquire, release);
}

/**
 * Creates a stream from an asynchronous callback that can be called multiple times
 * The registration of the callback itself returns a task. The optionality of the
 * error type `E` can be used to signal the end of the stream, by setting it to `None`.
 */
export function asyncM<R, E, A, R1 = R, E1 = E>(
   register: (
      cb: (
         next: T.Task<R, Option<E>, ReadonlyArray<A>>,
         offerCb?: (e: Exit<never, boolean>) => void
      ) => T.IO<Exit<never, boolean>>
   ) => T.Task<R1, E1, unknown>,
   outputBuffer = 16
): Stream<R & R1, E | E1, A> {
   return pipe(
      M.do,
      M.bindS("output", () => pipe(XQ.makeBounded<Take.Take<E, A>>(outputBuffer), T.toManaged())),
      M.bindS("runtime", () => pipe(T.runtime<R>(), T.toManaged())),
      M.tap(({ output, runtime }) =>
         T.toManaged()(
            register((k, cb) => pipe(Take.fromPull(k), T.chain(output.offer), (x) => runtime.runCancel(x, cb)))
         )
      ),
      M.bindS("done", () => XR.makeManagedRef(false)),
      M.letS("pull", ({ done, output }) =>
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
      M.map(({ pull }) => pull),
      managed,
      chain(repeatTaskChunkOption)
   );
}
