import * as A from "../Array";
import type { Either } from "../Either";
import * as E from "../Either";
import { flow, pipe } from "../Function";
import * as I from "../IO";
import * as C from "../IO/Cause";
import type { HasClock } from "../IO/Clock";
import { sequential } from "../IO/ExecutionStrategy";
import type { Exit } from "../IO/Exit";
import * as Sc from "../IO/Schedule";
import * as XR from "../IORef";
import * as M from "../Managed";
import type * as RM from "../Managed/ReleaseMap";
import type { Option } from "../Option";
import * as O from "../Option";
import type { XQueue } from "../Queue";
import * as XQ from "../Queue";
import type { FStream, URStream, UStream } from "./model";
import { Stream } from "./model";
import { chain, flatten } from "./monad";
import * as Pull from "./Pull";
import * as Take from "./Take";

/**
 * Creates a stream from an array of values
 */
export function fromArray<A>(c: ReadonlyArray<A>): UStream<A> {
  return new Stream(
    pipe(
      I.do,
      I.bindS("doneRef", () => XR.make(false)),
      I.letS("pull", ({ doneRef }) =>
        pipe(
          doneRef,
          XR.modify<I.FIO<Option<never>, ReadonlyArray<A>>, boolean>((done) =>
            done || c.length === 0 ? [Pull.end, true] : [I.pure(A.from(c)), true]
          ),
          I.flatten
        )
      ),
      I.map(({ pull }) => pull),
      I.toManaged()
    )
  );
}

/**
 * Creates a single-valued pure stream
 */
export function succeed<O>(o: O): UStream<O> {
  return fromArray([o]);
}

/**
 * The stream that always fails with the `error`
 */
export function fail<E>(e: E): FStream<E, never> {
  return fromEffect(I.fail(e));
}

/**
 * The `Stream` that dies with the error.
 */
export function die(e: unknown): UStream<never> {
  return fromEffect(I.die(e));
}

/**
 * The stream that dies with an exception described by `message`.
 */
export function dieMessage(message: string): Stream<unknown, never, never> {
  return fromEffect(I.dieMessage(message));
}

/**
 * The empty stream
 */
export const empty: UStream<never> = new Stream(M.succeed(Pull.end));

/**
 * The infinite stream of iterative function application: a, f(a), f(f(a)), f(f(f(a))), ...
 */
export function iterate<A>(a: A, f: (a: A) => A): UStream<A> {
  return new Stream(
    pipe(XR.make(a), I.toManaged(), M.map(flow(XR.getAndUpdate(f), I.map(A.pure))))
  );
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
      M.bindS("doneRef", () => XR.makeManaged(false)),
      M.bindS("finalizer", () => M.makeManagedReleaseMap(sequential)),
      M.letS("pull", ({ doneRef, finalizer }) =>
        I.uninterruptibleMask(({ restore }) =>
          pipe(
            doneRef.get,
            I.chain((done) =>
              done
                ? Pull.end
                : pipe(
                    I.do,
                    I.bindS("a", () =>
                      pipe(
                        ma.io,
                        I.map(([_, __]) => __),
                        I.gives((r: R) => [r, finalizer] as [R, RM.ReleaseMap]),
                        restore,
                        I.onError(() => doneRef.set(true))
                      )
                    ),
                    I.tap(() => doneRef.set(true)),
                    I.map(({ a }) => [a]),
                    I.mapError(O.some)
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
export function finalizer<R>(finalizer: I.URIO<R, unknown>): URStream<R, unknown> {
  return bracket((_) => finalizer)(I.unit());
}

/**
 * Creates a stream from an IO producing a value of type `A` or an empty Stream
 */
export function fromEffectOption<R, E, A>(fa: I.IO<R, Option<E>, A>): Stream<R, E, A> {
  return new Stream(
    pipe(
      M.do,
      M.bindS("doneRef", () => pipe(XR.make(false), I.toManaged())),
      M.letS("pull", ({ doneRef }) =>
        pipe(
          doneRef,
          XR.modify((b) => (b ? [Pull.end, true] : [pipe(fa, I.map(A.pure)), true])),
          I.flatten
        )
      ),
      M.map(({ pull }) => pull)
    )
  );
}

/**
 * Creates a stream from an IO producing a value of type `A`
 */
export function fromEffect<R, E, A>(ef: I.IO<R, E, A>): Stream<R, E, A> {
  return pipe(ef, I.mapError(O.some), fromEffectOption);
}

const unwrap = <R, E, O>(fa: I.IO<R, E, Stream<R, E, O>>): Stream<R, E, O> =>
  flatten(fromEffect(fa));
/**
 * Creates a stream from a `Schedule` that does not require any further
 * input. The stream will emit an element for each value output from the
 * schedule, continuing for as long as the schedule continues.
 */
export const fromSchedule: <R, A>(
  schedule: Sc.Schedule<R, unknown, A>
) => Stream<R & HasClock, never, A> = flow(
  Sc.driver,
  I.map((driver) => repeatEffectOption(driver.next(undefined))),
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
      next: I.IO<R, Option<E>, ReadonlyArray<A>>,
      offerCb?: (e: Exit<never, boolean>) => void
    ) => I.UIO<Exit<never, boolean>>
  ) => Option<Stream<R, E, A>>,
  outputBuffer = 16
): Stream<R, E, A> {
  return new Stream(
    pipe(
      M.do,
      M.bindS("output", () => pipe(XQ.makeBounded<Take.Take<E, A>>(outputBuffer), I.toManaged())),
      M.bindS("runtime", () => pipe(I.runtime<R>(), I.toManaged())),
      M.bindS("maybeStream", ({ output, runtime }) =>
        M.total(() =>
          register((k, cb) =>
            pipe(Take.fromPull(k), I.chain(output.offer), (x) => runtime.runCancel(x, cb))
          )
        )
      ),
      M.bindS("pull", ({ maybeStream, output }) =>
        O.fold_(
          maybeStream,
          () =>
            pipe(
              M.do,
              M.bindS("done", () => XR.makeManaged(false)),
              M.map(({ done }) =>
                pipe(
                  done.get,
                  I.chain((b) =>
                    b
                      ? Pull.end
                      : pipe(
                          output.take,
                          I.chain(Take.done),
                          I.onError(() =>
                            pipe(
                              done.set(true),
                              I.chain(() => output.shutdown)
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
              I.toManaged(),
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
      next: I.IO<R, Option<E>, ReadonlyArray<A>>,
      offerCb?: (e: Exit<never, boolean>) => void
    ) => I.UIO<Exit<never, boolean>>
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
      next: I.IO<R, Option<E>, ReadonlyArray<A>>,
      offerCb?: (e: Exit<never, boolean>) => void
    ) => I.UIO<Exit<never, boolean>>
  ) => Either<I.Canceler<R>, Stream<R, E, A>>,
  outputBuffer = 16
): Stream<R, E, A> {
  return new Stream(
    pipe(
      M.do,
      M.bindS("output", () => pipe(XQ.makeBounded<Take.Take<E, A>>(outputBuffer), I.toManaged())),
      M.bindS("runtime", () => pipe(I.runtime<R>(), I.toManaged())),
      M.bindS("eitherStream", ({ output, runtime }) =>
        M.total(() =>
          register((k, cb) =>
            pipe(Take.fromPull(k), I.chain(output.offer), (x) => runtime.runCancel(x, cb))
          )
        )
      ),
      M.bindS("pull", ({ eitherStream, output }) =>
        E.fold_(
          eitherStream,
          (canceler) =>
            pipe(
              M.do,
              M.bindS("done", () => XR.makeManaged(false)),
              M.map(({ done }) =>
                pipe(
                  done.get,
                  I.chain((b) =>
                    b
                      ? Pull.end
                      : pipe(
                          output.take,
                          I.chain(Take.done),
                          I.onError(() =>
                            pipe(
                              done.set(true),
                              I.chain(() => output.shutdown)
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
              I.toManaged(),
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
      next: I.IO<R, Option<E>, ReadonlyArray<A>>,
      offerCb?: (e: Exit<never, boolean>) => void
    ) => I.UIO<Exit<never, boolean>>
  ) => I.Canceler<R>,
  outputBuffer = 16
): Stream<R, E, A> {
  return asyncInterruptEither((cb) => E.left(register(cb)), outputBuffer);
}

/**
 * Creates a stream from an IO producing chunks of `A` values until it fails with None.
 */
export function repeatEffectChunkOption<R, E, A>(
  ef: I.IO<R, Option<E>, ReadonlyArray<A>>
): Stream<R, E, A> {
  return new Stream(
    pipe(
      M.do,
      M.bindS("done", () => XR.makeManaged(false)),
      M.letS("pull", ({ done }) =>
        pipe(
          done.get,
          I.chain((b) =>
            b
              ? Pull.end
              : pipe(
                  ef,
                  I.tapError(
                    O.fold(
                      () => done.set(true),
                      () => I.unit()
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

const ensuringFirst_ = <R, E, A, R1>(
  stream: Stream<R, E, A>,
  finalizer: I.IO<R1, never, unknown>
) => new Stream(M.ensuringFirst_(stream.proc, finalizer));

/**
 * Creates a stream from an IO producing values of type `A` until it fails with None.
 */
export const repeatEffectOption: <R, E, A>(fa: I.IO<R, Option<E>, A>) => Stream<R, E, A> = flow(
  I.map(A.pure),
  repeatEffectChunkOption
);

/**
 * Creates a stream from a `Queue` of values
 */
export function fromArrayQueue<R, E, O>(
  queue: XQueue<never, R, unknown, E, never, Array<O>>
): Stream<R, E, O> {
  return repeatEffectChunkOption(
    I.catchAllCause_(I.map_(queue.take, A.from), (c) =>
      I.chain_(queue.isShutdown, (down) => (down && C.interrupted(c) ? Pull.end : Pull.halt(c)))
    )
  );
}

/**
 * Creates a stream from a `Queue` of values. The queue will be shutdown once the stream is closed.
 */
export function fromArrayQueueWithShutdown<R, E, A>(
  queue: XQueue<never, R, unknown, E, never, Array<A>>
): Stream<R, E, A> {
  return ensuringFirst_(fromArrayQueue(queue), queue.shutdown);
}

/**
 * Creates a stream from an `XQueue` of values
 */
export function fromXQueue<R, E, A>(
  queue: XQueue<never, R, unknown, E, never, A>
): Stream<R, E, A> {
  return pipe(
    queue,
    XQ.takeBetween(1, Number.MAX_SAFE_INTEGER),
    I.map(A.from),
    I.catchAllCause((c) =>
      I.chain_(queue.isShutdown, (down) => (down && C.interrupted(c) ? Pull.end : Pull.halt(c)))
    ),
    repeatEffectChunkOption
  );
}

/**
 * Creates a stream from an `XQueue` of values. The queue will be shutdown once the stream is closed.
 */
export function fromXQueueWithShutdown<R, E, A>(
  queue: XQueue<never, R, unknown, E, never, A>
): Stream<R, E, A> {
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
export function apply<R, E, A>(
  proc: M.Managed<R, never, I.IO<R, Option<E>, ReadonlyArray<A>>>
): Stream<R, E, A> {
  return new Stream(proc);
}

/**
 * Creates a stream from a single value that will get cleaned up after the
 * stream is consumed
 */
export function bracket_<R, E, A, R1>(
  acquire: I.IO<R, E, A>,
  release: (a: A) => I.IO<R1, never, any>
): Stream<R & R1, E, A> {
  return managed(M.make_(acquire, release));
}

/**
 * Creates a stream from a single value that will get cleaned up after the
 * stream is consumed
 */
export function bracket<A, R1>(release: (a: A) => I.IO<R1, never, any>) {
  return <R, E>(acquire: I.IO<R, E, A>) => bracket_(acquire, release);
}

/**
 * Creates a stream from a single value that will get cleaned up after the
 * stream is consumed
 */
export function bracketExit_<R, E, A, R1>(
  acquire: I.IO<R, E, A>,
  release: (a: A, exit: Exit<unknown, unknown>) => I.IO<R1, never, unknown>
): Stream<R & R1, E, A> {
  return managed(M.makeExit_(acquire, release));
}

/**
 * Creates a stream from a single value that will get cleaned up after the
 * stream is consumed
 */
export function bracketExit<A, R1>(
  release: (a: A, exit: Exit<unknown, unknown>) => I.IO<R1, never, unknown>
): <R, E>(acquire: I.IO<R, E, A>) => Stream<R & R1, E, A> {
  return (acquire) => bracketExit_(acquire, release);
}

/**
 * Creates a stream from an asynchronous callback that can be called multiple times
 * The registration of the callback itself returns an IO. The optionality of the
 * error type `E` can be used to signal the end of the stream, by setting it to `None`.
 */
export function asyncM<R, E, A, R1 = R, E1 = E>(
  register: (
    cb: (
      next: I.IO<R, Option<E>, ReadonlyArray<A>>,
      offerCb?: (e: Exit<never, boolean>) => void
    ) => I.UIO<Exit<never, boolean>>
  ) => I.IO<R1, E1, unknown>,
  outputBuffer = 16
): Stream<R & R1, E | E1, A> {
  return pipe(
    M.do,
    M.bindS("output", () => pipe(XQ.makeBounded<Take.Take<E, A>>(outputBuffer), I.toManaged())),
    M.bindS("runtime", () => pipe(I.runtime<R>(), I.toManaged())),
    M.tap(({ output, runtime }) =>
      I.toManaged()(
        register((k, cb) =>
          pipe(Take.fromPull(k), I.chain(output.offer), (x) => runtime.runCancel(x, cb))
        )
      )
    ),
    M.bindS("done", () => XR.makeManaged(false)),
    M.letS("pull", ({ done, output }) =>
      pipe(
        done.get,
        I.chain((b) =>
          b
            ? Pull.end
            : pipe(
                output.take,
                I.chain(Take.done),
                I.onError(() =>
                  pipe(
                    done.set(true),
                    I.chain(() => output.shutdown)
                  )
                )
              )
        )
      )
    ),
    M.map(({ pull }) => pull),
    managed,
    chain(repeatEffectChunkOption)
  );
}
