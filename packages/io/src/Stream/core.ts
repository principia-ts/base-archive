import type { Chunk } from '../Chunk'
import type { HasClock } from '../Clock'
import type { Predicate, Refinement } from '@principia/base/data/Function'
import type { Has, Tag } from '@principia/base/data/Has'
import type { Option } from '@principia/base/data/Option'
import type * as HKT from '@principia/base/HKT'
import type { _E, _R } from '@principia/base/util/types'

import * as E from '@principia/base/data/Either'
import { flow, identity, not, pipe } from '@principia/base/data/Function'
import { isTag } from '@principia/base/data/Has'
import * as L from '@principia/base/data/List'
import * as O from '@principia/base/data/Option'
import { NoSuchElementException, PrematureGeneratorExit } from '@principia/base/util/GlobalExceptions'

import * as Ca from '../Cause'
import * as C from '../Chunk'
import { sequential } from '../ExecutionStrategy'
import * as Ex from '../Exit'
import * as I from '../IO'
import * as XR from '../IORef'
import * as M from '../Managed'
import * as RM from '../Managed/ReleaseMap'
import * as XQ from '../Queue'
import * as Sc from '../Schedule'
import * as BPull from './BufferedPull'
import * as Pull from './Pull'
import * as Sink from './Sink'
import * as Take from './Take'

/*
 * -------------------------------------------
 * Model
 * -------------------------------------------
 */

export const URI = 'Stream'
export type URI = typeof URI

export type V = HKT.V<'R', '-'> & HKT.V<'E', '+'>

/**
 * A `Stream<R, E, A>` is a description of a program that, when evaluated,
 * may emit 0 or more values of type `A`, may fail with errors of type `E`
 * and uses an environment of type `R`.
 *
 * One way to think of `Stream` is as a `IO` program that could emit multiple values.
 *
 * This data type can emit multiple `A` values through multiple calls to `next`.
 * Similarly, embedded inside every `Stream` is an IO program: `IO<R, Option<E>, Chunk<A>>`.
 * This program will be repeatedly evaluated as part of the stream execution. For
 * every evaluation, it will emit a chunk of values or end with an optional failure.
 * A failure of type `None` signals the end of the stream.
 *
 * `Stream` is a purely functional *pull* based stream. Pull based streams offer
 * inherent laziness and backpressure, relieving users of the need to manage buffers
 * between operatrs. As an optimization, `Stream` does not emit single values, but
 * rather an array of values. This allows the cost of effect evaluation to be
 * amortized.
 *
 * The last important attribute of `Stream` is resource management: it makes
 * heavy use of `Managed` to manage resources that are acquired
 * and released during the stream's lifetime.
 *
 * `Stream` forms a monad on its `A` type parameter, and has error management
 * facilities for its `E` type parameter, modeled similarly to `IO` (with some
 * adjustments for the multiple-valued nature of `Stream`). These aspects allow
 * for rich and expressive composition of streams.
 *
 * The current encoding of `Stream` is *not* safe for recursion. `Stream` programs
 * that are defined in terms of themselves will leak memory.
 *
 * Instead, recursive operators must be defined explicitly. See the definition of
 * `forever` for an example. This limitation will be lifted in the future.
 */
export class Stream<R, E, A> {
  readonly [I._U]: URI;
  readonly [I._E]: () => E;
  readonly [I._A]: () => A;
  readonly [I._R]: (_: R) => void

  constructor(readonly proc: M.Managed<R, never, I.IO<R, Option<E>, Chunk<A>>>) {}
}

/**
 * Type aliases
 */
export type UStream<A> = Stream<unknown, never, A>
export type URStream<R, A> = Stream<R, never, A>
export type FStream<E, A> = Stream<unknown, E, A>

/**
 * The default chunk size used by the various combinators and constructors of `Stream`.
 */
export const DefaultChunkSize = 4096

/**
 * @internal
 */
export class Chain<R_, E_, O, O2> {
  constructor(
    readonly f0: (a: O) => Stream<R_, E_, O2>,
    readonly outerStream: I.IO<R_, Option<E_>, Chunk<O>>,
    readonly currOuterChunk: XR.URef<[Chunk<O>, number]>,
    readonly currInnerStream: XR.URef<I.IO<R_, Option<E_>, Chunk<O2>>>,
    readonly innerFinalizer: XR.URef<RM.Finalizer>
  ) {
    this.apply        = this.apply.bind(this)
    this.closeInner   = this.closeInner.bind(this)
    this.pullNonEmpty = this.pullNonEmpty.bind(this)
    this.pullOuter    = this.pullOuter.bind(this)
  }

  closeInner() {
    return pipe(
      this.innerFinalizer,
      XR.getAndSet(RM.noopFinalizer),
      I.flatMap((f) => f(Ex.unit()))
    )
  }

  pullNonEmpty<R, E, O>(pull: I.IO<R, Option<E>, Chunk<O>>): I.IO<R, Option<E>, Chunk<O>> {
    return pipe(
      pull,
      I.flatMap((os) => (os.length > 0 ? I.pure(os) : this.pullNonEmpty(pull)))
    )
  }

  pullOuter() {
    return pipe(
      this.currOuterChunk,
      XR.modify(([chunk, nextIdx]): [I.IO<R_, Option<E_>, O>, [Chunk<O>, number]] => {
        if (nextIdx < chunk.length) {
          return [I.pure(chunk[nextIdx]), [chunk, nextIdx + 1]]
        } else {
          return [
            pipe(
              this.pullNonEmpty(this.outerStream),
              I.tap((os) => this.currOuterChunk.set([os, 1])),
              I.map((os) => os[0])
            ),
            [chunk, nextIdx]
          ]
        }
      }),
      I.flatten,
      I.flatMap((o) =>
        I.uninterruptibleMask(({ restore }) =>
          pipe(
            I.do,
            I.bindS('releaseMap', () => RM.make),
            I.bindS('pull', ({ releaseMap }) =>
              restore(
                pipe(
                  this.f0(o).proc.io,
                  I.gives((_: R_) => [_, releaseMap] as [R_, RM.ReleaseMap]),
                  I.map(([_, x]) => x)
                )
              )
            ),
            I.tap(({ pull }) => this.currInnerStream.set(pull)),
            I.tap(({ releaseMap }) => this.innerFinalizer.set((e) => M.releaseAll(e, sequential)(releaseMap))),
            I.asUnit
          )
        )
      )
    )
  }

  apply(): I.IO<R_, Option<E_>, Chunk<O2>> {
    return pipe(
      this.currInnerStream.get,
      I.flatten,
      I.catchAllCause((c) =>
        pipe(
          c,
          Ca.sequenceCauseOption,
          O.fold(
            // The additional switch is needed to eagerly run the finalizer
            // *before* pulling another element from the outer stream.
            () =>
              pipe(
                this.closeInner(),
                I.flatMap(() => this.pullOuter()),
                I.flatMap(() =>
                  new Chain(
                    this.f0,
                    this.outerStream,
                    this.currOuterChunk,
                    this.currInnerStream,
                    this.innerFinalizer
                  ).apply()
                )
              ),
            Pull.halt
          )
        )
      )
    )
  }
}

/*
 * -------------------------------------------
 * Constructors
 * -------------------------------------------
 */

/**
 * Creates a stream from an array of values
 */
export function fromChunk<A>(c: Chunk<A>): UStream<A> {
  return new Stream(
    pipe(
      I.do,
      I.bindS('doneRef', () => XR.make(false)),
      I.letS('pull', ({ doneRef }) =>
        pipe(
          doneRef,
          XR.modify<I.FIO<Option<never>, Chunk<A>>, boolean>((done) =>
            done || c.length === 0 ? [Pull.end, true] : [I.pure(c), true]
          ),
          I.flatten
        )
      ),
      I.map(({ pull }) => pull),
      I.toManaged()
    )
  )
}

/**
 * Creates a single-valued pure stream
 */
export function succeed<O>(o: O): UStream<O> {
  return fromChunk([o])
}

/**
 * The stream that always fails with the `error`
 */
export function fail<E>(e: E): FStream<E, never> {
  return fromEffect(I.fail(e))
}

/**
 * The `Stream` that dies with the error.
 */
export function die(e: unknown): UStream<never> {
  return fromEffect(I.die(e))
}

/**
 * The stream that dies with an exception described by `message`.
 */
export function dieMessage(message: string): Stream<unknown, never, never> {
  return fromEffect(I.dieMessage(message))
}

export function halt<E>(cause: Ca.Cause<E>): Stream<unknown, E, never> {
  return fromEffect(I.halt(cause))
}

/**
 * The empty stream
 */
export const empty: UStream<never> = new Stream(M.succeed(Pull.end))

/**
 * The infinite stream of iterative function application: a, f(a), f(f(a)), f(f(f(a))), ...
 */
export function iterate<A>(a: A, f: (a: A) => A): UStream<A> {
  return new Stream(pipe(XR.make(a), I.toManaged(), M.map(flow(XR.getAndUpdate(f), I.map(C.single)))))
}

export function suspend<R, E, A>(thunk: () => Stream<R, E, A>): Stream<R, E, A> {
  return new Stream(M.suspend(() => thunk().proc))
}

/**
 * Creates a single-valued stream from a managed resource
 */
export function managed<R, E, A>(ma: M.Managed<R, E, A>): Stream<R, E, A> {
  return new Stream(
    pipe(
      M.do,
      M.bindS('doneRef', () => XR.makeManaged(false)),
      M.bindS('finalizer', () => M.makeManagedReleaseMap(sequential)),
      M.letS('pull', ({ doneRef, finalizer }) =>
        I.uninterruptibleMask(({ restore }) =>
          pipe(
            doneRef.get,
            I.flatMap((done) =>
              done
                ? Pull.end
                : pipe(
                  I.do,
                  I.bindS('a', () =>
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
  )
}

/**
 * Creates a one-element stream that never fails and executes the finalizer when it ends.
 */
export function finalizer<R>(finalizer: I.URIO<R, unknown>): URStream<R, unknown> {
  return bracket((_) => finalizer)(I.unit())
}

/**
 * Creates a stream from an IO producing a value of type `A` or an empty Stream
 */
export function fromEffectOption<R, E, A>(fa: I.IO<R, Option<E>, A>): Stream<R, E, A> {
  return new Stream(
    pipe(
      M.do,
      M.bindS('doneRef', () => pipe(XR.make(false), I.toManaged())),
      M.letS('pull', ({ doneRef }) =>
        pipe(
          doneRef,
          XR.modify((b) => (b ? [Pull.end, true] : [pipe(fa, I.map(C.single)), true])),
          I.flatten
        )
      ),
      M.map(({ pull }) => pull)
    )
  )
}

/**
 * Creates a stream from an IO producing a value of type `A`
 */
export function fromEffect<R, E, A>(ef: I.IO<R, E, A>): Stream<R, E, A> {
  return pipe(ef, I.mapError(O.some), fromEffectOption)
}

const unwrap = <R, E, O>(fa: I.IO<R, E, Stream<R, E, O>>): Stream<R, E, O> => flatten(fromEffect(fa))
/**
 * Creates a stream from a `Schedule` that does not require any further
 * input. The stream will emit an element for each value output from the
 * schedule, continuing for as long as the schedule continues.
 */
export const fromSchedule: <R, A>(schedule: Sc.Schedule<R, unknown, A>) => Stream<R & HasClock, never, A> = flow(
  Sc.driver,
  I.map((driver) => repeatEffectOption(driver.next(undefined))),
  unwrap
)

/**
 * Creates a stream from an asynchronous callback that can be called multiple times.
 * The registration of the callback can possibly return the stream synchronously.
 * The optionality of the error type `E` can be used to signal the end of the stream,
 * by setting it to `None`.
 */
export function asyncOption<R, E, A>(
  register: (
    resolve: (
      next: I.IO<R, Option<E>, Chunk<A>>,
      offerCb?: (e: Ex.Exit<never, boolean>) => void
    ) => I.UIO<Ex.Exit<never, boolean>>
  ) => Option<Stream<R, E, A>>,
  outputBuffer = 16
): Stream<R, E, A> {
  return new Stream(
    pipe(
      M.do,
      M.bindS('output', () => pipe(XQ.makeBounded<Take.Take<E, A>>(outputBuffer), I.toManaged())),
      M.bindS('runtime', () => pipe(I.runtime<R>(), I.toManaged())),
      M.bindS('maybeStream', ({ output, runtime }) =>
        M.total(() =>
          register((k, cb) => pipe(Take.fromPull(k), I.flatMap(output.offer), (x) => runtime.runCancel(x, cb)))
        )
      ),
      M.bindS('pull', ({ maybeStream, output }) =>
        O.fold_(
          maybeStream,
          () =>
            pipe(
              M.do,
              M.bindS('done', () => XR.makeManaged(false)),
              M.map(({ done }) =>
                pipe(
                  done.get,
                  I.flatMap((b) =>
                    b
                      ? Pull.end
                      : pipe(
                        output.take,
                        I.flatMap(Take.done),
                        I.onError(() =>
                          pipe(
                            done.set(true),
                            I.flatMap(() => output.shutdown)
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
  )
}

/**
 * Creates a stream from an asynchronous callback that can be called multiple times.
 * The optionality of the error type `E` can be used to signal the end of the stream,
 * by setting it to `None`.
 */
export function async<R, E, A>(
  register: (
    resolve: (
      next: I.IO<R, Option<E>, Chunk<A>>,
      offerCb?: (e: Ex.Exit<never, boolean>) => void
    ) => I.UIO<Ex.Exit<never, boolean>>
  ) => void,
  outputBuffer = 16
): Stream<R, E, A> {
  return asyncOption((cb) => {
    register(cb)
    return O.none()
  }, outputBuffer)
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
      next: I.IO<R, Option<E>, Chunk<A>>,
      offerCb?: (e: Ex.Exit<never, boolean>) => void
    ) => I.UIO<Ex.Exit<never, boolean>>
  ) => E.Either<I.Canceler<R>, Stream<R, E, A>>,
  outputBuffer = 16
): Stream<R, E, A> {
  return new Stream(
    pipe(
      M.do,
      M.bindS('output', () => pipe(XQ.makeBounded<Take.Take<E, A>>(outputBuffer), I.toManaged())),
      M.bindS('runtime', () => pipe(I.runtime<R>(), I.toManaged())),
      M.bindS('eitherStream', ({ output, runtime }) =>
        M.total(() =>
          register((k, cb) => pipe(Take.fromPull(k), I.flatMap(output.offer), (x) => runtime.runCancel(x, cb)))
        )
      ),
      M.bindS('pull', ({ eitherStream, output }) =>
        E.fold_(
          eitherStream,
          (canceler) =>
            pipe(
              M.do,
              M.bindS('done', () => XR.makeManaged(false)),
              M.map(({ done }) =>
                pipe(
                  done.get,
                  I.flatMap((b) =>
                    b
                      ? Pull.end
                      : pipe(
                        output.take,
                        I.flatMap(Take.done),
                        I.onError(() =>
                          pipe(
                            done.set(true),
                            I.flatMap(() => output.shutdown)
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
  )
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
      next: I.IO<R, Option<E>, Chunk<A>>,
      offerCb?: (e: Ex.Exit<never, boolean>) => void
    ) => I.UIO<Ex.Exit<never, boolean>>
  ) => I.Canceler<R>,
  outputBuffer = 16
): Stream<R, E, A> {
  return asyncInterruptEither((cb) => E.left(register(cb)), outputBuffer)
}

/**
 * Creates a stream from an IO producing chunks of `A` values until it fails with None.
 */
export function repeatEffectChunkOption<R, E, A>(ef: I.IO<R, Option<E>, Chunk<A>>): Stream<R, E, A> {
  return new Stream(
    pipe(
      M.do,
      M.bindS('done', () => XR.makeManaged(false)),
      M.letS('pull', ({ done }) =>
        pipe(
          done.get,
          I.flatMap((b) =>
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
  )
}

const ensuringFirst_ = <R, E, A, R1>(stream: Stream<R, E, A>, finalizer: I.IO<R1, never, unknown>) =>
  new Stream(M.ensuringFirst_(stream.proc, finalizer))

/**
 * Creates a stream from an IO producing values of type `A` until it fails with None.
 */
export const repeatEffectOption: <R, E, A>(fa: I.IO<R, Option<E>, A>) => Stream<R, E, A> = flow(
  I.map(C.single),
  repeatEffectChunkOption
)

/**
 * Creates a stream from a `Queue` of values
 */
export function fromChunkQueue<R, E, O>(queue: XQ.XQueue<never, R, unknown, E, never, Chunk<O>>): Stream<R, E, O> {
  return repeatEffectChunkOption(
    I.catchAllCause_(queue.take, (c) =>
      I.flatMap_(queue.isShutdown, (down) => (down && Ca.interrupted(c) ? Pull.end : Pull.halt(c)))
    )
  )
}

/**
 * Creates a stream from a `Queue` of values. The queue will be shutdown once the stream is closed.
 */
export function fromChunkQueueWithShutdown<R, E, A>(
  queue: XQ.XQueue<never, R, unknown, E, never, Array<A>>
): Stream<R, E, A> {
  return ensuringFirst_(fromChunkQueue(queue), queue.shutdown)
}

/**
 * Creates a stream from an `XQueue` of values
 */
export function fromXQueue<R, E, A>(queue: XQ.XQueue<never, R, unknown, E, never, A>): Stream<R, E, A> {
  return pipe(
    queue,
    XQ.takeBetween(1, Number.MAX_SAFE_INTEGER),
    I.catchAllCause((c) =>
      I.flatMap_(queue.isShutdown, (down) => (down && Ca.interrupted(c) ? Pull.end : Pull.halt(c)))
    ),
    repeatEffectChunkOption
  )
}

/**
 * Creates a stream from an `XQueue` of values. The queue will be shutdown once the stream is closed.
 */
export function fromQueueWithShutdown<R, E, A>(queue: XQ.XQueue<never, R, unknown, E, never, A>): Stream<R, E, A> {
  return ensuringFirst_(fromXQueue(queue), queue.shutdown)
}

/**
 * Creates a new `Stream` from a managed effect that yields chunks.
 * The effect will be evaluated repeatedly until it fails with a `None`
 * (to signify stream end) or a `Some<E>` (to signify stream failure).
 *
 * The stream evaluation guarantees proper acquisition and release of the
 * `Managed`.
 */
export function apply<R, E, A>(proc: M.Managed<R, never, I.IO<R, Option<E>, Chunk<A>>>): Stream<R, E, A> {
  return new Stream(proc)
}

/**
 * Creates a stream from a single value that will get cleaned up after the
 * stream is consumed
 */
export function bracket_<R, E, A, R1>(
  acquire: I.IO<R, E, A>,
  release: (a: A) => I.IO<R1, never, any>
): Stream<R & R1, E, A> {
  return managed(M.make_(acquire, release))
}

/**
 * Creates a stream from a single value that will get cleaned up after the
 * stream is consumed
 */
export function bracket<A, R1>(release: (a: A) => I.IO<R1, never, any>) {
  return <R, E>(acquire: I.IO<R, E, A>) => bracket_(acquire, release)
}

/**
 * Creates a stream from a single value that will get cleaned up after the
 * stream is consumed
 */
export function bracketExit_<R, E, A, R1>(
  acquire: I.IO<R, E, A>,
  release: (a: A, exit: Ex.Exit<unknown, unknown>) => I.IO<R1, never, unknown>
): Stream<R & R1, E, A> {
  return managed(M.makeExit_(acquire, release))
}

/**
 * Creates a stream from a single value that will get cleaned up after the
 * stream is consumed
 */
export function bracketExit<A, R1>(
  release: (a: A, exit: Ex.Exit<unknown, unknown>) => I.IO<R1, never, unknown>
): <R, E>(acquire: I.IO<R, E, A>) => Stream<R & R1, E, A> {
  return (acquire) => bracketExit_(acquire, release)
}

/**
 * Creates a stream from an asynchronous callback that can be called multiple times
 * The registration of the callback itself returns an IO. The optionality of the
 * error type `E` can be used to signal the end of the stream, by setting it to `None`.
 */
export function asyncM<R, E, A, R1 = R, E1 = E>(
  register: (
    cb: (
      next: I.IO<R, Option<E>, Chunk<A>>,
      offerCb?: (e: Ex.Exit<never, boolean>) => void
    ) => I.UIO<Ex.Exit<never, boolean>>
  ) => I.IO<R1, E1, unknown>,
  outputBuffer = 16
): Stream<R & R1, E | E1, A> {
  return pipe(
    M.do,
    M.bindS('output', () => pipe(XQ.makeBounded<Take.Take<E, A>>(outputBuffer), I.toManaged())),
    M.bindS('runtime', () => pipe(I.runtime<R>(), I.toManaged())),
    M.tap(({ output, runtime }) =>
      I.toManaged()(
        register((k, cb) => pipe(Take.fromPull(k), I.flatMap(output.offer), (x) => runtime.runCancel(x, cb)))
      )
    ),
    M.bindS('done', () => XR.makeManaged(false)),
    M.letS('pull', ({ done, output }) =>
      pipe(
        done.get,
        I.flatMap((b) =>
          b
            ? Pull.end
            : pipe(
              output.take,
              I.flatMap(Take.done),
              I.onError(() =>
                pipe(
                  done.set(true),
                  I.flatMap(() => output.shutdown)
                )
              )
            )
        )
      )
    ),
    M.map(({ pull }) => pull),
    managed,
    chain(repeatEffectChunkOption)
  )
}

/*
 * -------------------------------------------
 * Destructors
 * -------------------------------------------
 */

/**
 * Runs the sink on the stream to produce either the sink's result or an error.
 */
export function runManaged_<R, E, A, R1, E1, B>(
  stream: Stream<R, E, A>,
  sink: Sink.Sink<R1, E1, A, any, B>
): M.Managed<R & R1, E1 | E, B> {
  return pipe(
    M.product_(stream.proc, sink.push),
    M.mapM(([pull, push]) => {
      const go: I.IO<R1 & R, E1 | E, B> = I.foldCauseM_(
        pull,
        (c): I.IO<R1, E1 | E, B> =>
          pipe(
            Ca.sequenceCauseOption(c),
            O.fold(
              () =>
                I.foldCauseM_(
                  push(O.none()),
                  (c) =>
                    pipe(
                      c,
                      Ca.map(([_]) => _),
                      Ca.sequenceCauseEither,
                      E.fold(I.halt, I.pure)
                    ),
                  () => I.die('empty stream / empty sinks')
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
                Ca.map(([_]) => _),
                Ca.sequenceCauseEither,
                E.fold(I.halt, I.pure)
              ),
            () => go
          )
      )
      return go
    })
  )
}

/**
 * Runs the sink on the stream to produce either the sink's result or an error.
 */
export function runManaged<A, R1, E1, B>(
  sink: Sink.Sink<R1, E1, A, any, B>
): <R, E>(stream: Stream<R, E, A>) => M.Managed<R & R1, E1 | E, B> {
  return (stream) => runManaged_(stream, sink)
}

/**
 * Runs the sink on the stream to produce either the sink's result or an error.
 */
export function run_<R, E, A, R1, E1, B>(stream: Stream<R, E, A>, sink: Sink.Sink<R1, E1, A, any, B>) {
  return M.useNow(runManaged_(stream, sink))
}

/**
 * Runs the sink on the stream to produce either the sink's result or an error.
 */
export function run<A, R1, E1, B>(
  sink: Sink.Sink<R1, E1, A, any, B>
): <R, E>(stream: Stream<R, E, A>) => I.IO<R & R1, E1 | E, B> {
  return (stream) => run_(stream, sink)
}

export function runCollect<R, E, A>(stream: Stream<R, E, A>): I.IO<R, E, Chunk<A>> {
  return run_(stream, Sink.collectAll<A>())
}

/**
 * Runs the stream and collects all of its elements to an array.
 */
export function runDrain<R, E, A>(stream: Stream<R, E, A>): I.IO<R, E, void> {
  return pipe(
    stream,
    foreach((_) => I.unit())
  )
}

/**
 * Consumes all elements of the stream, passing them to the specified callback.
 */
export function foreach_<R, E, A, R1, E1, B>(
  stream: Stream<R, E, A>,
  f: (a: A) => I.IO<R1, E1, B>
): I.IO<R & R1, E | E1, void> {
  return run_(stream, Sink.fromForeach(f))
}

/**
 * Consumes all elements of the stream, passing them to the specified callback.
 */
export function foreach<A, R1, E1, B>(
  f: (a: A) => I.IO<R1, E1, B>
): <R, E>(stream: Stream<R, E, A>) => I.IO<R & R1, E1 | E, void> {
  return (stream) => foreach_(stream, f)
}

/**
 * Like `foreach`, but returns a `Managed` so the finalization order
 * can be controlled.
 */
export function foreachManaged_<R, E, A, R1, E1, B>(
  stream: Stream<R, E, A>,
  f: (a: A) => I.IO<R1, E1, B>
): M.Managed<R & R1, E | E1, void> {
  return runManaged_(stream, Sink.fromForeach(f))
}

/**
 * Like `foreach`, but returns a `Managed` so the finalization order
 * can be controlled.
 */
export function foreachManaged<A, R1, E1, B>(
  f: (a: A) => I.IO<R1, E1, B>
): <R, E>(stream: Stream<R, E, A>) => M.Managed<R & R1, E1 | E, void> {
  return (stream) => foreachManaged_(stream, f)
}

export function foreachChunk_<R, E, O, R1, E1, O1>(
  stream: Stream<R, E, O>,
  f: (chunk: Chunk<O>) => I.IO<R1, E1, O1>
): I.IO<R & R1, E | E1, void> {
  return run_(stream, Sink.fromForeachChunk(f))
}

export function foreachChunk<O, R1, E1, O1>(
  f: (chunk: Chunk<O>) => I.IO<R1, E1, O1>
): <R, E>(stream: Stream<R, E, O>) => I.IO<R & R1, E | E1, void> {
  return (stream) => foreachChunk_(stream, f)
}

export function foreachChunkManaged_<R, E, O, R1, E1, O1>(
  stream: Stream<R, E, O>,
  f: (chunk: Chunk<O>) => I.IO<R1, E1, O1>
): M.Managed<R & R1, E | E1, void> {
  return runManaged_(stream, Sink.fromForeachChunk(f))
}

export function foreachChunkManaged<O, R1, E1, O1>(
  f: (chunk: Chunk<O>) => I.IO<R1, E1, O1>
): <R, E>(stream: Stream<R, E, O>) => M.Managed<R & R1, E | E1, void> {
  return (stream) => foreachChunkManaged_(stream, f)
}

export function foreachWhileManaged_<R, E, O, R1, E1>(
  stream: Stream<R, E, O>,
  f: (o: O) => I.IO<R1, E1, boolean>
): M.Managed<R & R1, E | E1, void> {
  return runManaged_(stream, Sink.foreachWhile(f))
}

/*
 * -------------------------------------------
 * Bifunctor
 * -------------------------------------------
 */

/**
 * Transforms the errors emitted by this stream using `f`.
 */
export function mapError_<R, E, A, D>(pab: Stream<R, E, A>, f: (e: E) => D) {
  return new Stream(pipe(pab.proc, M.map(I.mapError(O.map(f)))))
}

/**
 * Transforms the errors emitted by this stream using `f`.
 */
export function mapError<E, D>(f: (e: E) => D) {
  return <R, A>(pab: Stream<R, E, A>) => mapError_(pab, f)
}

/**
 * Transforms the full causes of failures emitted by this stream.
 */
export function mapErrorCause_<R, E, A, E1>(
  stream: Stream<R, E, A>,
  f: (e: Ca.Cause<E>) => Ca.Cause<E1>
): Stream<R, E1, A> {
  return new Stream(
    pipe(
      stream.proc,
      M.map(
        I.mapErrorCause((cause) =>
          pipe(
            Ca.sequenceCauseOption(cause),
            O.fold(
              () => Ca.fail(O.none()),
              (c) => Ca.map_(f(c), O.some)
            )
          )
        )
      )
    )
  )
}

/**
 * Transforms the full causes of failures emitted by this stream.
 */
export function mapErrorCause<E, D>(
  f: (e: Ca.Cause<E>) => Ca.Cause<D>
): <R, A>(stream: Stream<R, E, A>) => Stream<R, D, A> {
  return (stream) => mapErrorCause_(stream, f)
}

/**
 * Returns a stream whose failure and success channels have been mapped by
 * the specified pair of functions, `f` and `g`.
 */
export function bimap_<R, E, O, E1, O1>(pab: Stream<R, E, O>, f: (e: E) => E1, g: (o: O) => O1): Stream<R, E1, O1> {
  return pipe(pab, mapError(f), map(g))
}

/**
 * Returns a stream whose failure and success channels have been mapped by
 * the specified pair of functions, `f` and `g`.
 */
export function bimap<E, O, E1, O1>(f: (e: E) => E1, g: (o: O) => O1): <R>(pab: Stream<R, E, O>) => Stream<R, E1, O1> {
  return (pab) => bimap_(pab, f, g)
}

/*
 * -------------------------------------------
 * Fallible
 * -------------------------------------------
 */

export const absolve: <R, E, A, E1>(stream: Stream<R, E, E.Either<E1, A>>) => Stream<R, E | E1, A> = chain(
  E.fold(fail, succeed)
)

/*
 * -------------------------------------------
 * Filterable
 * -------------------------------------------
 */

/**
 * Applies the predicate to each element and allows passing elements
 * to reach the output of this stream.
 */
export function filter<O, O1 extends O>(f: Refinement<O, O1>): <R, E>(self: Stream<R, E, O>) => Stream<R, E, O1>
export function filter<O>(f: Predicate<O>): <R, E>(fa: Stream<R, E, O>) => Stream<R, E, O>
export function filter<O>(f: Predicate<O>): <R, E>(fa: Stream<R, E, O>) => Stream<R, E, O> {
  return <R, E>(fa: Stream<R, E, O>): Stream<R, E, O> => filter_(fa, f)
}

/**
 * Applies the predicate to each element and allows passing elements
 * to reach the output of this stream.
 */
export function filter_<R, E, O, O1 extends O>(fa: Stream<R, E, O>, f: Refinement<O, O1>): Stream<R, E, O1>
export function filter_<R, E, O>(fa: Stream<R, E, O>, f: Predicate<O>): Stream<R, E, O>
export function filter_<R, E, O>(fa: Stream<R, E, O>, f: Predicate<O>): Stream<R, E, O> {
  return mapChunks_(fa, C.filter(f))
}

/**
 * Effectfully filters the elements emitted by this stream.
 */
export function filterM_<R, R1, E, E1, O>(
  fa: Stream<R, E, O>,
  f: (o: O) => I.IO<R1, E1, boolean>
): Stream<R & R1, E | E1, O> {
  return new Stream(
    M.map_(M.mapM_(fa.proc, BPull.make), (os) => {
      const pull: Pull.Pull<R & R1, E | E1, O> = I.flatMap_(BPull.pullElement(os), (o) =>
        I.flatMap_(
          I.mapError_(f(o), (v) => O.some(v)),
          (_) => {
            if (_) {
              return I.succeed(C.single(o))
            } else {
              return pull
            }
          }
        )
      )

      return pull
    })
  )
}

/**
 * Effectfully filters the elements emitted by this stream.
 */
export function filterM<R1, E1, O>(f: (o: O) => I.IO<R1, E1, boolean>) {
  return <R, E>(fa: Stream<R, E, O>) => filterM_(fa, f)
}

/**
 * Filters this stream by the specified predicate, removing all elements for
 * which the predicate evaluates to true.
 */
export function filterNot_<R, E, O>(fa: Stream<R, E, O>, pred: Predicate<O>): Stream<R, E, O> {
  return filter_(fa, not(pred))
}

/**
 * Filters this stream by the specified predicate, removing all elements for
 * which the predicate evaluates to true.
 */
export function filterNot<O>(pred: Predicate<O>) {
  return <R, E>(fa: Stream<R, E, O>) => filterNot_(fa, pred)
}

export function filterMap_<R, E, O, O1>(fa: Stream<R, E, O>, f: (o: O) => Option<O1>): Stream<R, E, O1> {
  return mapChunks_(fa, C.filterMap(f))
}

export function filterMap<O, O1>(f: (o: O) => Option<O1>): <R, E>(fa: Stream<R, E, O>) => Stream<R, E, O1> {
  return (fa) => filterMap_(fa, f)
}

export function filterMapM_<R, E, O, R1, E1, O1>(
  fa: Stream<R, E, O>,
  f: (o: O) => Option<I.IO<R1, E1, O1>>
): Stream<R & R1, E | E1, O1> {
  return new Stream(
    M.gen(function* (_) {
      const os = yield* _(M.mapM_(fa.proc, BPull.make))
      const go = (): I.IO<R & R1, O.Option<E | E1>, Chunk<O1>> =>
        I.flatMap_(
          BPull.pullElement(os),
          flow(
            f,
            O.fold(
              go,
              I.bimap(O.some, (o1) => [o1])
            )
          )
        )
      return go()
    })
  )
}

export function filterMapM<O, R1, E1, O1>(
  f: (o: O) => Option<I.IO<R1, E1, O1>>
): <R, E>(fa: Stream<R, E, O>) => Stream<R & R1, E | E1, O1> {
  return (fa) => filterMapM_(fa, f)
}

/*
 * -------------------------------------------
 * Functor
 * -------------------------------------------
 */

/**
 * Effectfully transforms the chunks emitted by this stream.
 */
export function mapChunksM_<R, E, A, R1, E1, B>(
  fa: Stream<R, E, A>,
  f: (chunks: Chunk<A>) => I.IO<R1, E1, Chunk<B>>
): Stream<R & R1, E | E1, B> {
  return new Stream(
    pipe(
      fa.proc,
      M.map((e) =>
        pipe(
          e,
          I.flatMap((x) => pipe(f(x), I.mapError<E1, Option<E | E1>>(O.some)))
        )
      )
    )
  )
}

/**
 * Effectfully transforms the chunks emitted by this stream.
 */
export function mapChunksM<A, R1, E1, A1>(
  f: (chunks: Chunk<A>) => I.IO<R1, E1, Chunk<A1>>
): <R, E>(fa: Stream<R, E, A>) => Stream<R & R1, E1 | E, A1> {
  return (fa) => mapChunksM_(fa, f)
}

/**
 * Transforms the chunks emitted by this stream.
 */
export function mapChunks_<R, E, A, B>(fa: Stream<R, E, A>, f: (chunks: Chunk<A>) => Chunk<B>): Stream<R, E, B> {
  return mapChunksM_(fa, flow(f, I.pure))
}

/**
 * Transforms the chunks emitted by this stream.
 */
export function mapChunks<A, B>(f: (chunks: Chunk<A>) => Chunk<B>): <R, E>(fa: Stream<R, E, A>) => Stream<R, E, B> {
  return (fa) => mapChunks_(fa, f)
}

/**
 * Transforms the chunks emitted by this stream.
 */
export function map_<R, E, A, B>(fa: Stream<R, E, A>, f: (a: A) => B): Stream<R, E, B> {
  return mapChunks_(fa, C.map(f))
}

/**
 * Transforms the chunks emitted by this stream.
 */
export function map<A, B>(f: (a: A) => B): <R, E>(fa: Stream<R, E, A>) => Stream<R, E, B> {
  return (fa) => map_(fa, f)
}

/**
 * Maps over elements of the stream with the specified effectful function.
 */
export function mapM_<R, E, A, R1, E1, B>(
  fa: Stream<R, E, A>,
  f: (a: A) => I.IO<R1, E1, B>
): Stream<R & R1, E | E1, B> {
  return new Stream<R & R1, E | E1, B>(
    pipe(
      fa.proc,
      M.mapM(BPull.make),
      M.map((pull) =>
        pipe(
          pull,
          BPull.pullElement,
          I.flatMap((o) => pipe(f(o), I.bimap(O.some, C.single)))
        )
      )
    )
  )
}

/**
 * Maps over elements of the stream with the specified effectful function.
 */
export function mapM<A, R1, E1, A1>(
  f: (o: A) => I.IO<R1, E1, A1>
): <R, E>(fa: Stream<R, E, A>) => Stream<R & R1, E1 | E, A1> {
  return (fa) => mapM_(fa, f)
}

/*
 * -------------------------------------------
 * Monad
 * -------------------------------------------
 */

/**
 * Returns a stream made of the concatenation in strict order of all the streams
 * produced by passing each element of this stream to `f0`
 */
export function chain_<R, E, A, Q, D, B>(ma: Stream<R, E, A>, f: (a: A) => Stream<Q, D, B>): Stream<R & Q, E | D, B> {
  type R_ = R & Q
  type E_ = E | D

  return new Stream(
    pipe(
      M.do,
      M.bindS('outerStream', () => ma.proc),
      M.bindS('currOuterChunk', () =>
        I.toManaged()(
          XR.make<[Chunk<A>, number]>([C.empty(), 0])
        )
      ),
      M.bindS('currInnerStream', () => I.toManaged()(XR.make<I.IO<R_, Option<E_>, Chunk<B>>>(Pull.end))),
      M.bindS('innerFinalizer', () => M.finalizerRef(RM.noopFinalizer) as M.Managed<R_, never, XR.URef<RM.Finalizer>>),
      M.map(({ currInnerStream, currOuterChunk, innerFinalizer, outerStream }) =>
        new Chain(f, outerStream, currOuterChunk, currInnerStream, innerFinalizer).apply()
      )
    )
  )
}

/**
 * Returns a stream made of the concatenation in strict order of all the streams
 * produced by passing each element of this stream to `f0`
 */
export function chain<A, Q, D, B>(
  f: (a: A) => Stream<Q, D, B>
): <R, E>(ma: Stream<R, E, A>) => Stream<Q & R, D | E, B> {
  return (ma) => chain_(ma, f)
}

/**
 * Flattens this stream-of-streams into a stream made of the concatenation in
 * strict order of all the streams.
 */
export function flatten<R, E, Q, D, A>(ffa: Stream<R, E, Stream<Q, D, A>>): Stream<Q & R, D | E, A> {
  return chain_(ffa, identity)
}

export function tap_<R, E, O, R1, E1, O1>(
  ma: Stream<R, E, O>,
  f: (o: O) => I.IO<R1, E1, O1>
): Stream<R & R1, E | E1, O> {
  return mapM_(ma, (o) => I.as_(f(o), () => o))
}

export function tap<O, R1, E1, O1>(
  f: (o: O) => I.IO<R1, E1, O1>
): <R, E>(ma: Stream<R, E, O>) => Stream<R & R1, E | E1, O> {
  return (ma) => tap_(ma, f)
}

/*
 * -------------------------------------------
 * Reader
 * -------------------------------------------
 */

/**
 * Accesses the whole environment of the stream.
 */
export function ask<R>(): URStream<R, R> {
  return fromEffect(I.ask<R>())
}

/**
 * Accesses the environment of the stream.
 */
export function asks<R, A>(f: (_: R) => A): Stream<R, never, A> {
  return map_(ask(), f)
}

/**
 * Accesses the environment of the stream in the context of an IO.
 */
export function asksM<R0, R, E, A>(f: (_: R0) => I.IO<R, E, A>): Stream<R & R0, E, A> {
  return mapM_(ask<R0>(), f)
}

/**
 * Accesses the environment of the stream in the context of a stream.
 */
export function asksStream<R0, R, E, A>(f: (_: R0) => Stream<R, E, A>): Stream<R0 & R, E, A> {
  return chain_(ask<R0>(), f)
}

/**
 * Provides the stream with its required environment, which eliminates
 * its dependency on `R`.
 */
export function giveAll_<R, E, O>(ra: Stream<R, E, O>, r: R): Stream<unknown, E, O> {
  return new Stream(M.map_(M.giveAll_(ra.proc, r), I.giveAll(r)))
}

/**
 * Provides the stream with its required environment, which eliminates
 * its dependency on `R`.
 */
export function giveAll<R>(r: R): <E, O>(ra: Stream<R, E, O>) => Stream<unknown, E, O> {
  return (ra) => giveAll_(ra, r)
}

/*
 * -------------------------------------------
 * Gen
 * -------------------------------------------
 */

export class GenStream<R, E, A> {
  readonly _R!: (_R: R) => void
  readonly _E!: () => E
  readonly _A!: () => A
  constructor(readonly S: () => Stream<R, E, A>) {}
  *[Symbol.iterator](): Generator<GenStream<R, E, A>, A, any> {
    return yield this
  }
}

const adapter = (_: any, __?: any) => {
  return new GenStream(() => {
    const x = _()
    if (O.isOption(x)) {
      return x._tag === 'None' ? fail(__ ? __() : new NoSuchElementException('Stream.gen')) : succeed(x.value)
    } else if (E.isEither(x)) {
      return fromEffect(I.fromEither(() => x))
    } else if (x instanceof Stream) {
      return x
    } else if (isTag(x)) {
      return fromEffect(I.askService(x))
    }
    return fromEffect(x)
  })
}
export function gen<R0, E0, A0>(): <T extends GenStream<R0, E0, any>>(
  f: (i: {
    <A>(_: () => Tag<A>): GenStream<Has<A>, never, A>
    <E, A>(_: () => Option<A>, onNone: () => E): GenStream<unknown, E, A>
    <A>(_: () => Option<A>): GenStream<unknown, NoSuchElementException, A>
    <E, A>(_: () => E.Either<E, A>): GenStream<unknown, E, A>
    <R, E, A>(_: () => I.IO<R, E, A>): GenStream<R, E, A>
    <R, E, A>(_: () => Stream<R, E, A>): GenStream<R, E, A>
  }) => Generator<T, A0, any>
) => Stream<_R<T>, _E<T>, A0>
export function gen<E0, A0>(): <T extends GenStream<any, E0, any>>(
  f: (i: {
    <A>(_: () => Tag<A>): GenStream<Has<A>, never, A>
    <E, A>(_: () => Option<A>, onNone: () => E): GenStream<unknown, E, A>
    <A>(_: () => Option<A>): GenStream<unknown, NoSuchElementException, A>
    <E, A>(_: () => E.Either<E, A>): GenStream<unknown, E, A>
    <R, E, A>(_: () => I.IO<R, E, A>): GenStream<R, E, A>
    <R, E, A>(_: () => Stream<R, E, A>): GenStream<R, E, A>
  }) => Generator<T, A0, any>
) => Stream<_R<T>, _E<T>, A0>
export function gen<A0>(): <T extends GenStream<any, any, any>>(
  f: (i: {
    <A>(_: () => Tag<A>): GenStream<Has<A>, never, A>
    <E, A>(_: () => Option<A>, onNone: () => E): GenStream<unknown, E, A>
    <A>(_: () => Option<A>): GenStream<unknown, NoSuchElementException, A>
    <E, A>(_: () => E.Either<E, A>): GenStream<unknown, E, A>
    <R, E, A>(_: () => I.IO<R, E, A>): GenStream<R, E, A>
    <R, E, A>(_: () => Stream<R, E, A>): GenStream<R, E, A>
  }) => Generator<T, A0, any>
) => Stream<_R<T>, _E<T>, A0>
export function gen<T extends GenStream<any, any, any>, A0>(
  f: (i: {
    <A>(_: () => Tag<A>): GenStream<Has<A>, never, A>
    <E, A>(_: () => Option<A>, onNone: () => E): GenStream<unknown, E, A>
    <A>(_: () => Option<A>): GenStream<unknown, NoSuchElementException, A>
    <E, A>(_: () => E.Either<E, A>): GenStream<unknown, E, A>
    <R, E, A>(_: () => I.IO<R, E, A>): GenStream<R, E, A>
    <R, E, A>(_: () => Stream<R, E, A>): GenStream<R, E, A>
  }) => Generator<T, A0, any>
): Stream<_R<T>, _E<T>, A0>
export function gen(...args: any[]): any {
  function gen_<T extends GenStream<any, any, any>, A>(f: (i: any) => Generator<T, A, any>): Stream<_R<T>, _E<T>, A> {
    return suspend(() => {
      function run(replayStack: L.List<any>): Stream<any, any, A> {
        const iterator = f(adapter as any)
        let state = iterator.next()
        let prematureExit = false
        L.forEach_(replayStack, (a) => {
          if (state.done) {
            prematureExit = true
          }
          state = iterator.next(a)
        })
        if (prematureExit) {
          return fromEffect(I.die(new PrematureGeneratorExit('Stream.gen')))
        }
        if (state.done) {
          return succeed(state.value)
        }
        return chain_(state.value.S(), (val) => {
          return run(L.append_(replayStack, val))
        })
      }
      return run(L.empty())
    })
  }
  if (args.length === 0) {
    return (f: any) => gen_(f)
  }
  return gen_(args[0])
}
