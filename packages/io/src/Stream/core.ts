import type { Chunk } from '../Chunk'
import type { ExecutionStrategy } from '../ExecutionStrategy'
import type { Fiber } from '../Fiber'
import type { Managed } from '../Managed'
import type { Schedule } from '../Schedule'
import type { Transducer } from './Transducer'
import type { Has, Tag } from '@principia/base/Has'
import type { Option } from '@principia/base/Option'
import type { Predicate } from '@principia/base/Predicate'
import type { Refinement } from '@principia/base/Refinement'
import type { _E, _R } from '@principia/base/util/types'

import * as E from '@principia/base/Either'
import { NoSuchElementError, PrematureGeneratorExitError } from '@principia/base/Error'
import { constTrue, flow, identity, not, pipe, tuple } from '@principia/base/function'
import { isTag } from '@principia/base/Has'
import * as L from '@principia/base/List'
import * as Map from '@principia/base/Map'
import * as O from '@principia/base/Option'
import { matchTag } from '@principia/base/util/matchers'

import * as Ca from '../Cause'
import * as C from '../Chunk'
import { Clock } from '../Clock'
import { parallel, sequential } from '../ExecutionStrategy'
import * as Ex from '../Exit'
import * as Fi from '../Fiber'
import * as I from '../IO'
import * as Ref from '../IORef'
import * as RefM from '../IORefM'
import * as M from '../Managed'
import * as RM from '../Managed/ReleaseMap'
import * as P from '../Promise'
import * as Queue from '../Queue'
import * as Sc from '../Schedule'
import { globalScope } from '../Scope'
import * as Semaphore from '../Semaphore'
import * as BPull from './BufferedPull'
import * as Ha from './Handoff'
import * as Pull from './Pull'
import * as Sink from './Sink'
import * as Take from './Take'
import * as Tr from './Transducer'

/*
 * -------------------------------------------
 * Model
 * -------------------------------------------
 */

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
  readonly [I._U]: 'Stream';
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
    readonly currOuterChunk: Ref.URef<[Chunk<O>, number]>,
    readonly currInnerStream: Ref.URef<I.IO<R_, Option<E_>, Chunk<O2>>>,
    readonly innerFinalizer: Ref.URef<RM.Finalizer>
  ) {
    this.apply        = this.apply.bind(this)
    this.closeInner   = this.closeInner.bind(this)
    this.pullNonEmpty = this.pullNonEmpty.bind(this)
    this.pullOuter    = this.pullOuter.bind(this)
  }

  closeInner() {
    return pipe(
      this.innerFinalizer,
      Ref.getAndSet(RM.noopFinalizer),
      I.bind((f) => f(Ex.unit()))
    )
  }

  pullNonEmpty<R, E, O>(pull: I.IO<R, Option<E>, Chunk<O>>): I.IO<R, Option<E>, Chunk<O>> {
    return pipe(
      pull,
      I.bind((os) => (os.length > 0 ? I.pure(os) : this.pullNonEmpty(pull)))
    )
  }

  pullOuter() {
    const self = this
    return pipe(
      self.currOuterChunk,
      Ref.modify(([chunk, nextIdx]): [I.IO<R_, Option<E_>, O>, [Chunk<O>, number]] => {
        if (nextIdx < chunk.length) {
          return [I.pure(chunk[nextIdx]), [chunk, nextIdx + 1]]
        } else {
          return [
            pipe(
              self.pullNonEmpty(self.outerStream),
              I.tap((os) => self.currOuterChunk.set([os, 1])),
              I.map((os) => os[0])
            ),
            [chunk, nextIdx]
          ]
        }
      }),
      I.flatten,
      I.bind((o) =>
        I.uninterruptibleMask(({ restore }) =>
          I.gen(function* (_) {
            const releaseMap = yield* _(RM.make)
            const pull       = yield* _(
              pipe(
                self.f0(o).proc.io,
                I.gives((_: R_) => tuple(_, releaseMap)),
                I.map(([, x]) => x),
                restore
              )
            )
            yield* _(self.currInnerStream.set(pull))
            yield* _(self.innerFinalizer.set((e) => M.releaseAll(e, sequential)(releaseMap)))
          })
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
          O.match(
            // The additional switch is needed to eagerly run the finalizer
            // *before* pulling another element from the outer stream.
            () =>
              pipe(
                this.closeInner(),
                I.bind(() => this.pullOuter()),
                I.bind(() =>
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
    I.toManaged_(
      I.gen(function* (_) {
        const doneRef = yield* _(Ref.make(false))
        const pull    = pipe(
          doneRef,
          Ref.modify<I.FIO<Option<never>, Chunk<A>>, boolean>((done) =>
            done || c.length === 0 ? tuple(Pull.end, true) : tuple(I.succeed(c), true)
          ),
          I.flatten
        )

        return pull
      })
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
export function die(e: Error): UStream<never> {
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
  return new Stream(pipe(Ref.make(a), I.toManaged(), M.map(flow(Ref.getAndUpdate(f), I.map(C.pure)))))
}

export function defer<R, E, A>(thunk: () => Stream<R, E, A>): Stream<R, E, A> {
  return new Stream(M.defer(() => thunk().proc))
}

/**
 * Creates a single-valued stream from a managed resource
 */
export function managed<R, E, A>(ma: M.Managed<R, E, A>): Stream<R, E, A> {
  return new Stream(
    M.gen(function* (_) {
      const doneRef   = yield* _(Ref.makeManaged(false))
      const finalizer = yield* _(M.makeManagedReleaseMap(sequential))

      const pull = I.uninterruptibleMask(({ restore }) =>
        pipe(
          doneRef.get,
          I.bind((done) => {
            if (done) {
              return Pull.end
            } else {
              return pipe(
                I.gen(function* (_) {
                  const a = yield* _(
                    pipe(
                      ma.io,
                      I.map(([, a]) => a),
                      I.gives((r: R) => tuple(r, finalizer)),
                      restore,
                      I.onError(() => doneRef.set(true))
                    )
                  )
                  yield* _(doneRef.set(true))
                  return C.pure(a)
                }),
                I.mapError(O.Some)
              )
            }
          })
        )
      )
      return pull
    })
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
    M.gen(function* (_) {
      const doneRef = yield* _(Ref.make(false))

      const pull = pipe(
        doneRef,
        Ref.modify((done) => {
          if (done) return tuple(Pull.end, true)
          else return tuple(I.map_(fa, C.pure), true)
        }),
        I.flatten
      )
      return pull
    })
  )
}

/**
 * Creates a stream from an IO producing a value of type `A`
 */
export function fromEffect<R, E, A>(ef: I.IO<R, E, A>): Stream<R, E, A> {
  return pipe(ef, I.mapError(O.Some), fromEffectOption)
}

/**
 * Creates a stream from a `Schedule` that does not require any further
 * input. The stream will emit an element for each value output from the
 * schedule, continuing for as long as the schedule continues.
 */
export function fromSchedule<R, A>(schedule: Sc.Schedule<R, unknown, A>): Stream<R & Has<Clock>, never, A> {
  return pipe(
    schedule,
    Sc.driver,
    I.map((driver) => repeatEffectOption(driver.next(undefined))),
    unwrap
  )
}

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
    M.gen(function* (_) {
      const output      = yield* _(Queue.makeBounded<Take.Take<E, A>>(outputBuffer))
      const runtime     = yield* _(I.runtime<R>())
      const maybeStream = yield* _(
        M.effectTotal(() => register((k, cb) => pipe(Take.fromPull(k), I.bind(output.offer), runtime.runCancel(cb))))
      )

      const pull = yield* _(
        O.match_(
          maybeStream,
          () =>
            M.map_(Ref.makeManaged(false), (doneRef) =>
              pipe(
                doneRef.get,
                I.bind((done) => {
                  if (done) {
                    return Pull.end
                  } else {
                    return pipe(
                      output.take,
                      I.bind(Take.done),
                      I.onError(() => pipe(doneRef.set(true), I.apr(output.shutdown)))
                    )
                  }
                })
              )
            ),
          (s) => pipe(output.shutdown, I.toManaged(), M.apr(s.proc))
        )
      )
      return pull
    })
  )
}

/**
 * Creates a stream from an asynchronous callback that can be called multiple times.
 * The optionality of the error type `E` can be used to signal the end of the stream,
 * by setting it to `None`.
 */
export function effectAsync<R, E, A>(
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
    return O.None()
  }, outputBuffer)
}

/**
 * Creates a stream from an asynchronous callback that can be called multiple times.
 * The registration of the callback returns either a canceler or synchronously returns a stream.
 * The optionality of the error type `E` can be used to signal the end of the stream, by
 * setting it to `None`.
 */
export function effectAsyncInterruptEither<R, E, A>(
  register: (
    resolve: (
      next: I.IO<R, Option<E>, Chunk<A>>,
      offerCb?: (e: Ex.Exit<never, boolean>) => void
    ) => I.UIO<Ex.Exit<never, boolean>>
  ) => E.Either<I.Canceler<R>, Stream<R, E, A>>,
  outputBuffer = 16
): Stream<R, E, A> {
  return new Stream(
    M.gen(function* (_) {
      const output       = yield* _(Queue.makeBounded<Take.Take<E, A>>(outputBuffer))
      const runtime      = yield* _(I.runtime<R>())
      const eitherStream = yield* _(
        M.effectTotal(() =>
          register((k, cb) => pipe(Take.fromPull(k), I.bind(output.offer), (x) => runtime.runCancel_(x, cb)))
        )
      )

      const pull = yield* _(
        E.match_(
          eitherStream,
          (canceler) =>
            pipe(
              Ref.makeManaged(false),
              M.map((doneRef) =>
                pipe(
                  doneRef.get,
                  I.bind((done) => {
                    if (done) {
                      return Pull.end
                    } else {
                      return pipe(
                        output.take,
                        I.bind(Take.done),
                        I.onError(() => pipe(doneRef.set(true), I.apr(output.shutdown)))
                      )
                    }
                  })
                )
              ),
              M.ensuring(canceler)
            ),
          (s) => pipe(output.shutdown, I.toManaged(), M.apr(s.proc))
        )
      )
      return pull
    })
  )
}

/**
 * Creates a stream from an asynchronous callback that can be called multiple times.
 * The registration of the callback returns either a canceler or synchronously returns a stream.
 * The optionality of the error type `E` can be used to signal the end of the stream, by
 * setting it to `None`.
 */
export function effectAsyncInterrupt<R, E, A>(
  register: (
    cb: (
      next: I.IO<R, Option<E>, Chunk<A>>,
      offerCb?: (e: Ex.Exit<never, boolean>) => void
    ) => I.UIO<Ex.Exit<never, boolean>>
  ) => I.Canceler<R>,
  outputBuffer = 16
): Stream<R, E, A> {
  return effectAsyncInterruptEither((cb) => E.Left(register(cb)), outputBuffer)
}

/**
 * Like `unfold`, but allows the emission of values to end one step further than
 * the unfolding of the state. This is useful for embedding paginated APIs,
 * hence the name.
 */
export function paginate<S, A>(s: S, f: (s: S) => readonly [A, Option<S>]): Stream<unknown, never, A> {
  return paginateM(s, flow(f, I.succeed))
}

/**
 * Like `unfoldM`, but allows the emission of values to end one step further than
 * the unfolding of the state. This is useful for embedding paginated APIs,
 * hence the name.
 */
export function paginateM<S, R, E, A>(s: S, f: (s: S) => I.IO<R, E, readonly [A, Option<S>]>): Stream<R, E, A> {
  return paginateChunkM(
    s,
    flow(
      f,
      I.map(([a, s]) => tuple(C.pure(a), s))
    )
  )
}

/**
 * Like `unfoldChunk`, but allows the emission of values to end one step further than
 * the unfolding of the state. This is useful for embedding paginated APIs,
 * hence the name.
 */
export function paginateChunk<S, A>(
  s: S,
  f: (s: S) => readonly [Chunk<A>, Option<S>]
): Stream<unknown, never, A> {
  return paginateChunkM(s, flow(f, I.succeed))
}

/**
 * Like `unfoldChunkM`, but allows the emission of values to end one step further than
 * the unfolding of the state. This is useful for embedding paginated APIs,
 * hence the name.
 */
export function paginateChunkM<S, R, E, A>(
  s: S,
  f: (s: S) => I.IO<R, E, readonly [Chunk<A>, Option<S>]>
): Stream<R, E, A> {
  return new Stream(
    M.gen(function* (_) {
      const ref = yield* _(Ref.make(O.Some(s)))
      return pipe(
        ref.get,
        I.bind(
          O.match(
            () => Pull.end,
            flow(
              f,
              I.matchM(Pull.fail, ([as, s]) =>
                pipe(
                  ref.set(s),
                  I.as(() => as)
                )
              )
            )
          )
        )
      )
    })
  )
}

export function range(min: number, max: number, chunkSize = 16): Stream<unknown, never, number> {
  const pull = (ref: Ref.URef<number>) =>
    I.gen(function* (_) {
      const start = yield* _(Ref.getAndUpdate_(ref, (n) => n + chunkSize))
      yield* _(I.when(() => start >= max)(I.fail(O.None())))
      return C.range(start, Math.min(start + chunkSize, max))
    })

  return new Stream(pipe(Ref.makeManaged(min), M.map(pull)))
}

/**
 * Repeats the provided value infinitely.
 */
export function repeat<A>(a: A): Stream<unknown, never, A> {
  return repeatEffect(I.succeed(a))
}

/**
 * Creates a stream from an IO producing chunks of `A` values until it fails with None.
 */
export function repeatEffectChunkOption<R, E, A>(ef: I.IO<R, Option<E>, Chunk<A>>): Stream<R, E, A> {
  return new Stream(
    M.gen(function* (_) {
      const doneRef = yield* _(Ref.make(false))
      const pull    = I.bind_(doneRef.get, (done) => {
        if (done) {
          return Pull.end
        } else {
          return I.tapError_(
            ef,
            O.match(
              () => doneRef.set(true),
              () => I.unit()
            )
          )
        }
      })
      return pull
    })
  )
}

/**
 * Creates a stream from an effect producing chunks of `A` values which repeats forever.
 */
export function repeatEffectChunk<R, E, A>(fa: I.IO<R, E, Chunk<A>>): Stream<R, E, A> {
  return repeatEffectChunkOption(I.mapError_(fa, O.Some))
}

/**
 * Creates a stream from an IO producing values of type `A` until it fails with None.
 */
export function repeatEffectOption<R, E, A>(fa: I.IO<R, Option<E>, A>): Stream<R, E, A> {
  return pipe(fa, I.map(C.pure), repeatEffectChunkOption)
}

/**
 * Creates a stream from an effect producing a value of type `A` which repeats forever.
 */
export function repeatEffect<R, E, A>(fa: I.IO<R, E, A>): Stream<R, E, A> {
  return repeatEffectOption(I.mapError_(fa, O.Some))
}

/**
 * Creates a stream from an effect producing a value of type `A`, which is repeated using the
 * specified schedule.
 */
export function repeatEffectWith_<R, E, A>(
  effect: I.IO<R, E, A>,
  schedule: Schedule<R, A, any>
): Stream<R & Has<Clock>, E, A> {
  return pipe(
    effect,
    I.cross(Sc.driver(schedule)),
    fromEffect,
    bind(([a, driver]) =>
      pipe(
        succeed(a),
        concat(
          unfoldM(
            a,
            flow(
              driver.next,
              I.matchM(I.succeed, () =>
                pipe(
                  effect,
                  I.map((nextA) => O.Some(tuple(nextA, nextA)))
                )
              )
            )
          )
        )
      )
    )
  )
}

/**
 * Creates a stream from an effect producing a value of type `A`, which is repeated using the
 * specified schedule.
 */
export function repeatEffectWith<R, A>(
  schedule: Schedule<R, A, any>
): <E>(effect: I.IO<R, E, A>) => Stream<R & Has<Clock>, E, A> {
  return (effect) => repeatEffectWith_(effect, schedule)
}

export function repeatWith_<R, A>(a: A, schedule: Schedule<R, A, any>): Stream<R & Has<Clock>, never, A> {
  return repeatEffectWith_(I.succeed(a), schedule)
}

export function repeatWith<R, A>(schedule: Schedule<R, A, any>): (a: A) => Stream<R & Has<Clock>, never, A> {
  return (a) => repeatWith_(a, schedule)
}

/**
 * Creates a stream from a `Queue` of values
 */
export function fromChunkQueue<R, E, O>(
  queue: Queue.XQueue<never, R, unknown, E, never, Chunk<O>>
): Stream<R, E, O> {
  return repeatEffectChunkOption(
    I.catchAllCause_(queue.take, (c) =>
      I.bind_(queue.isShutdown, (down) => (down && Ca.interrupted(c) ? Pull.end : Pull.halt(c)))
    )
  )
}

/**
 * Creates a stream from a `Queue` of values. The queue will be shutdown once the stream is closed.
 */
export function fromChunkQueueWithShutdown<R, E, A>(
  queue: Queue.XQueue<never, R, unknown, E, never, Array<A>>
): Stream<R, E, A> {
  return ensuringFirst_(fromChunkQueue(queue), queue.shutdown)
}

/**
 * Creates a stream from an `XQueue` of values
 */
export function fromQueue<R, E, A>(queue: Queue.XQueue<never, R, unknown, E, never, A>): Stream<R, E, A> {
  return pipe(
    queue,
    Queue.takeBetween(1, Number.MAX_SAFE_INTEGER),
    I.catchAllCause((c) => I.bind_(queue.isShutdown, (down) => (down && Ca.interrupted(c) ? Pull.end : Pull.halt(c)))),
    repeatEffectChunkOption
  )
}

/**
 * Creates a stream from an `XQueue` of values. The queue will be shutdown once the stream is closed.
 */
export function fromQueueWithShutdown<R, E, A>(queue: Queue.XQueue<never, R, unknown, E, never, A>): Stream<R, E, A> {
  return ensuringFirst_(fromQueue(queue), queue.shutdown)
}

/**
 * Creates a stream from an iterable collection of values
 */
export function fromIterable<A>(iterable: () => Iterable<A>): Stream<unknown, Error, A> {
  class StreamEnd extends Error {}

  return pipe(
    fromEffect(I.effectTotal(() => iterable()[Symbol.iterator]())),
    bind((it) =>
      repeatEffectOption(
        pipe(
          I.effect(() => {
            const v = it.next()
            if (!v.done) {
              return v.value
            } else {
              throw new StreamEnd()
            }
          }),
          I.mapError((err) => {
            if (err instanceof StreamEnd) {
              return O.None()
            } else {
              return O.Some(err)
            }
          })
        )
      )
    )
  )
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
    M.gen(function* (_) {
      const output  = yield* _(Queue.makeBounded<Take.Take<E, A>>(outputBuffer))
      const runtime = yield* _(I.runtime<R>())
      yield* _(register((k, cb) => pipe(Take.fromPull(k), I.bind(output.offer), (x) => runtime.runCancel_(x, cb))))
      const doneRef = yield* _(Ref.make(false))
      const pull    = I.bind_(doneRef.get, (done) => {
        if (done) {
          return Pull.end
        } else {
          return pipe(
            output.take,
            I.bind(Take.done),
            I.onError(() => pipe(doneRef.set(true), I.apr(output.shutdown)))
          )
        }
      })
      return pull
    }),
    managed,
    bind(repeatEffectChunkOption)
  )
}

/*
 * -------------------------------------------
 * Run
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
    M.cross_(stream.proc, sink.push),
    M.mapM(([pull, push]) => {
      const go: I.IO<R1 & R, E1 | E, B> = I.matchCauseM_(
        pull,
        (c): I.IO<R1, E1 | E, B> =>
          pipe(
            Ca.sequenceCauseOption(c),
            O.match(
              () =>
                I.matchCauseM_(
                  push(O.None()),
                  (c) =>
                    pipe(
                      c,
                      Ca.map(([_]) => _),
                      Ca.sequenceCauseEither,
                      E.match(I.halt, I.pure)
                    ),
                  () => I.dieMessage('empty stream / empty sinks')
                ),
              I.halt
            )
          ),
        (os) =>
          I.matchCauseM_(
            push(O.Some(os)),
            (c): I.IO<unknown, E1, B> =>
              pipe(
                c,
                Ca.map(([_]) => _),
                Ca.sequenceCauseEither,
                E.match(I.halt, I.pure)
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
): <R, E>(ma: Stream<R, E, A>) => M.Managed<R & R1, E1 | E, B> {
  return (ma) => runManaged_(ma, sink)
}

/**
 * Runs the sink on the stream to produce either the sink's result or an error.
 */
export function run_<R, E, A, R1, E1, B>(ma: Stream<R, E, A>, sink: Sink.Sink<R1, E1, A, any, B>) {
  return M.useNow(runManaged_(ma, sink))
}

/**
 * Runs the sink on the stream to produce either the sink's result or an error.
 */
export function run<A, R1, E1, B>(
  sink: Sink.Sink<R1, E1, A, any, B>
): <R, E>(ma: Stream<R, E, A>) => I.IO<R & R1, E1 | E, B> {
  return (ma) => run_(ma, sink)
}

export function runCollect<R, E, A>(ma: Stream<R, E, A>): I.IO<R, E, Chunk<A>> {
  return run_(ma, Sink.collectAll<A>())
}

/**
 * Runs the stream and collects all of its elements to an array.
 */
export function runDrain<R, E, A>(ma: Stream<R, E, A>): I.IO<R, E, void> {
  return pipe(
    ma,
    foreach((_) => I.unit())
  )
}

/**
 * Consumes all elements of the stream, passing them to the specified callback.
 */
export function foreach_<R, E, A, R1, E1, B>(
  ma: Stream<R, E, A>,
  f: (a: A) => I.IO<R1, E1, B>
): I.IO<R & R1, E | E1, void> {
  return run_(ma, Sink.foreach(f))
}

/**
 * Consumes all elements of the stream, passing them to the specified callback.
 */
export function foreach<A, R1, E1, B>(
  f: (a: A) => I.IO<R1, E1, B>
): <R, E>(ma: Stream<R, E, A>) => I.IO<R & R1, E1 | E, void> {
  return (ma) => foreach_(ma, f)
}

/**
 * Like `foreach`, but returns a `Managed` so the finalization order
 * can be controlled.
 */
export function foreachManaged_<R, E, A, R1, E1, B>(
  ma: Stream<R, E, A>,
  f: (a: A) => I.IO<R1, E1, B>
): M.Managed<R & R1, E | E1, void> {
  return runManaged_(ma, Sink.foreach(f))
}

/**
 * Like `foreach`, but returns a `Managed` so the finalization order
 * can be controlled.
 */
export function foreachManaged<A, R1, E1, B>(
  f: (a: A) => I.IO<R1, E1, B>
): <R, E>(ma: Stream<R, E, A>) => M.Managed<R & R1, E1 | E, void> {
  return (ma) => foreachManaged_(ma, f)
}

export function foreachChunk_<R, E, A, R1, E1, A1>(
  ma: Stream<R, E, A>,
  f: (chunk: Chunk<A>) => I.IO<R1, E1, A1>
): I.IO<R & R1, E | E1, void> {
  return run_(ma, Sink.foreachChunk(f))
}

export function foreachChunk<A, R1, E1, A1>(
  f: (chunk: Chunk<A>) => I.IO<R1, E1, A1>
): <R, E>(ma: Stream<R, E, A>) => I.IO<R & R1, E | E1, void> {
  return (ma) => foreachChunk_(ma, f)
}

export function foreachChunkManaged_<R, E, A, R1, E1, A1>(
  stream: Stream<R, E, A>,
  f: (chunk: Chunk<A>) => I.IO<R1, E1, A1>
): M.Managed<R & R1, E | E1, void> {
  return runManaged_(stream, Sink.foreachChunk(f))
}

export function foreachChunkManaged<A, R1, E1, A1>(
  f: (chunk: Chunk<A>) => I.IO<R1, E1, A1>
): <R, E>(stream: Stream<R, E, A>) => M.Managed<R & R1, E | E1, void> {
  return (stream) => foreachChunkManaged_(stream, f)
}

export function foreachWhileManaged_<R, E, A, R1, E1>(
  ma: Stream<R, E, A>,
  f: (a: A) => I.IO<R1, E1, boolean>
): M.Managed<R & R1, E | E1, void> {
  return runManaged_(ma, Sink.foreachWhile(f))
}

export function foreachWhileManaged<A, R1, E1>(
  f: (a: A) => I.IO<R1, E1, boolean>
): <R, E>(ma: Stream<R, E, A>) => M.Managed<R & R1, E | E1, void> {
  return (ma) => foreachWhileManaged_(ma, f)
}

/*
 * -------------------------------------------
 * Bifunctor
 * -------------------------------------------
 */

/**
 * Transforms the errors emitted by this stream using `f`.
 */
export function mapError_<R, E, A, E1>(pab: Stream<R, E, A>, f: (e: E) => E1) {
  return new Stream(pipe(pab.proc, M.map(I.mapError(O.map(f)))))
}

/**
 * Transforms the errors emitted by this stream using `f`.
 */
export function mapError<E, E1>(f: (e: E) => E1) {
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
            O.match(
              () => Ca.fail(O.None()),
              (c) => Ca.map_(f(c), O.Some)
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
export function mapErrorCause<E, E1>(
  f: (e: Ca.Cause<E>) => Ca.Cause<E1>
): <R, A>(stream: Stream<R, E, A>) => Stream<R, E1, A> {
  return (stream) => mapErrorCause_(stream, f)
}

/**
 * Returns a stream whose failure and success channels have been mapped by
 * the specified pair of functions, `f` and `g`.
 */
export function bimap_<R, E, A, E1, A1>(pab: Stream<R, E, A>, f: (e: E) => E1, g: (a: A) => A1): Stream<R, E1, A1> {
  return pipe(pab, mapError(f), map(g))
}

/**
 * Returns a stream whose failure and success channels have been mapped by
 * the specified pair of functions, `f` and `g`.
 */
export function bimap<E, A, E1, A1>(f: (e: E) => E1, g: (a: A) => A1): <R>(pab: Stream<R, E, A>) => Stream<R, E1, A1> {
  return (pab) => bimap_(pab, f, g)
}

/*
 * -------------------------------------------
 * Fallible
 * -------------------------------------------
 */

export const absolve: <R, E, A, E1>(stream: Stream<R, E, E.Either<E1, A>>) => Stream<R, E | E1, A> = bind(
  E.match(fail, succeed)
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
export function filter<A, A1 extends A>(f: Refinement<A, A1>): <R, E>(self: Stream<R, E, A>) => Stream<R, E, A1>
export function filter<A>(f: Predicate<A>): <R, E>(fa: Stream<R, E, A>) => Stream<R, E, A>
export function filter<A>(f: Predicate<A>): <R, E>(fa: Stream<R, E, A>) => Stream<R, E, A> {
  return <R, E>(fa: Stream<R, E, A>): Stream<R, E, A> => filter_(fa, f)
}

/**
 * Applies the predicate to each element and allows passing elements
 * to reach the output of this stream.
 */
export function filter_<R, E, A, A1 extends A>(fa: Stream<R, E, A>, f: Refinement<A, A1>): Stream<R, E, A1>
export function filter_<R, E, A>(fa: Stream<R, E, A>, f: Predicate<A>): Stream<R, E, A>
export function filter_<R, E, A>(fa: Stream<R, E, A>, f: Predicate<A>): Stream<R, E, A> {
  return mapChunks_(fa, C.filter(f))
}

/**
 * Effectfully filters the elements emitted by this stream.
 */
export function filterM_<R, R1, E, E1, A>(
  fa: Stream<R, E, A>,
  f: (a: A) => I.IO<R1, E1, boolean>
): Stream<R & R1, E | E1, A> {
  return new Stream(
    pipe(
      fa.proc,
      M.mapM(BPull.make),
      M.map((os) => {
        const pull: Pull.Pull<R & R1, E | E1, A> = pipe(
          os,
          BPull.pullElement,
          I.bind((o) =>
            pipe(
              f(o),
              I.mapError(O.Some),
              I.bind((_) => {
                if (_) return I.succeed(C.pure(o))
                else return pull
              })
            )
          )
        )
        return pull
      })
    )
  )
}

/**
 * Effectfully filters the elements emitted by this stream.
 */
export function filterM<R1, E1, A>(f: (o: A) => I.IO<R1, E1, boolean>) {
  return <R, E>(fa: Stream<R, E, A>) => filterM_(fa, f)
}

/**
 * Filters this stream by the specified predicate, removing all elements for
 * which the predicate evaluates to true.
 */
export function filterNot_<R, E, A>(fa: Stream<R, E, A>, pred: Predicate<A>): Stream<R, E, A> {
  return filter_(fa, not(pred))
}

/**
 * Filters this stream by the specified predicate, removing all elements for
 * which the predicate evaluates to true.
 */
export function filterNot<A>(pred: Predicate<A>) {
  return <R, E>(fa: Stream<R, E, A>) => filterNot_(fa, pred)
}

/**
 * Performs a filter and a map in a single step
 */
export function filterMap_<R, E, A, A1>(fa: Stream<R, E, A>, f: (a: A) => Option<A1>): Stream<R, E, A1> {
  return mapChunks_(fa, C.filterMap(f))
}

/**
 * Performs a filter and a map in a single step
 */
export function filterMap<A, A1>(f: (a: A) => Option<A1>): <R, E>(fa: Stream<R, E, A>) => Stream<R, E, A1> {
  return (fa) => filterMap_(fa, f)
}

/**
 * Performs an effectful filter and map in a single step.
 */
export function filterMapM_<R, E, A, R1, E1, A1>(
  fa: Stream<R, E, A>,
  f: (a: A) => Option<I.IO<R1, E1, A1>>
): Stream<R & R1, E | E1, A1> {
  return new Stream(
    M.gen(function* (_) {
      const os = yield* _(M.mapM_(fa.proc, BPull.make))

      const go: I.IO<R & R1, O.Option<E | E1>, Chunk<A1>> = I.bind_(
        BPull.pullElement(os),
        flow(
          f,
          O.match(
            () => go,
            I.bimap(O.Some, (o1) => [o1])
          )
        )
      )
      return go
    })
  )
}

/**
 * Performs an effectful filter and map in a single step.
 */
export function filterMapM<A, R1, E1, A1>(
  f: (a: A) => Option<I.IO<R1, E1, A1>>
): <R, E>(fa: Stream<R, E, A>) => Stream<R & R1, E | E1, A1> {
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
      M.map((e) => pipe(e, I.bind(flow(f, I.mapError<E1, Option<E | E1>>(O.Some)))))
    )
  )
}

/**
 * Effectfully transforms the chunks emitted by this stream.
 */
export function mapChunksM<A, R1, E1, B>(
  f: (chunks: Chunk<A>) => I.IO<R1, E1, Chunk<B>>
): <R, E>(fa: Stream<R, E, A>) => Stream<R & R1, E1 | E, B> {
  return (fa) => mapChunksM_(fa, f)
}

/**
 * Transforms the chunks emitted by this stream.
 */
export function mapChunks_<R, E, A, B>(
  fa: Stream<R, E, A>,
  f: (chunks: Chunk<A>) => Chunk<B>
): Stream<R, E, B> {
  return mapChunksM_(fa, flow(f, I.pure))
}

/**
 * Transforms the chunks emitted by this stream.
 */
export function mapChunks<A, B>(
  f: (chunks: Chunk<A>) => Chunk<B>
): <R, E>(fa: Stream<R, E, A>) => Stream<R, E, B> {
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
          I.bind((o) => pipe(f(o), I.bimap(O.Some, C.pure)))
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

/**
 * Maps the success values of this stream to the specified constant value.
 */
export function as_<R, E, A, B>(ma: Stream<R, E, A>, b: () => B): Stream<R, E, B> {
  return map_(ma, () => b())
}

/**
 * Maps the success values of this stream to the specified constant value.
 */
export function as<B>(b: () => B): <R, E, A>(ma: Stream<R, E, A>) => Stream<R, E, B> {
  return (ma) => as_(ma, b)
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
export function bind_<R, E, A, R1, E1, B>(
  ma: Stream<R, E, A>,
  f: (a: A) => Stream<R1, E1, B>
): Stream<R & R1, E | E1, B> {
  type R_ = R & R1
  type E_ = E | E1

  return new Stream(
    M.gen(function* (_) {
      const outerStream     = yield* _(ma.proc)
      const currOuterChunk  = yield* _(
        Ref.make<[Chunk<A>, number]>([C.empty(), 0])
      )
      const currInnerStream = yield* _(Ref.make<I.IO<R_, Option<E_>, Chunk<B>>>(Pull.end))
      const innerFinalizer  = yield* _(M.finalizerRef(RM.noopFinalizer))
      return new Chain(f, outerStream, currOuterChunk, currInnerStream, innerFinalizer).apply()
    })
  )
}

/**
 * Returns a stream made of the concatenation in strict order of all the streams
 * produced by passing each element of this stream to `f0`
 */
export function bind<A, R1, E1, B>(
  f: (a: A) => Stream<R1, E1, B>
): <R, E>(ma: Stream<R, E, A>) => Stream<R1 & R, E1 | E, B> {
  return (ma) => bind_(ma, f)
}

/**
 * Flattens this stream-of-streams into a stream made of the concatenation in
 * strict order of all the streams.
 */
export function flatten<R, E, R1, E1, A>(mma: Stream<R, E, Stream<R1, E1, A>>): Stream<R1 & R, E1 | E, A> {
  return bind_(mma, identity)
}

export function tap_<R, E, A, R1, E1, A1>(
  ma: Stream<R, E, A>,
  f: (a: A) => I.IO<R1, E1, A1>
): Stream<R & R1, E | E1, A> {
  return mapM_(ma, (a) => I.as_(f(a), () => a))
}

export function tap<A, R1, E1, A1>(
  f: (a: A) => I.IO<R1, E1, A1>
): <R, E>(ma: Stream<R, E, A>) => Stream<R & R1, E | E1, A> {
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
export function asks<R, A>(f: (_: R) => A): URStream<R, A> {
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
  return bind_(ask<R0>(), f)
}

/**
 * Provides the stream with its required environment, which eliminates
 * its dependency on `R`.
 */
export function giveAll_<R, E, A>(ra: Stream<R, E, A>, r: R): FStream<E, A> {
  return new Stream(M.map_(M.giveAll_(ra.proc, r), I.giveAll(r)))
}

/**
 * Provides the stream with its required environment, which eliminates
 * its dependency on `R`.
 */
export function giveAll<R>(r: R): <E, A>(ra: Stream<R, E, A>) => FStream<E, A> {
  return (ra) => giveAll_(ra, r)
}

/*
 * -------------------------------------------
 * Combinators
 * -------------------------------------------
 */

/**
 * Submerges the chunks carried by this stream into the stream's structure, while
 * still preserving them.
 */
export function flattenChunks<R, E, A>(ma: Stream<R, E, Chunk<A>>): Stream<R, E, A> {
  return new Stream(pipe(ma.proc, M.mapM(BPull.make), M.map(BPull.pullElement)))
}

/**
 * Unwraps `Exit` values that also signify end-of-stream by failing with `None`.
 */
export function flattenExitOption<R, E, E1, A>(ma: Stream<R, E, Ex.Exit<O.Option<E1>, A>>): Stream<R, E | E1, A> {
  return new Stream(
    M.gen(function* (_) {
      const upstream = yield* _(M.mapM_(ma.proc, BPull.make))
      const doneRef  = yield* _(Ref.make(false))
      const pull     = pipe(
        doneRef.get,
        I.bind((done) => {
          if (done) {
            return Pull.end
          } else {
            return pipe(
              BPull.pullElement(upstream),
              I.matchM(
                O.match(
                  () => pipe(doneRef.set(true), I.apr(Pull.end)),
                  (e) => Pull.fail(e as E | E1)
                ),
                flow(
                  I.done,
                  I.matchM(
                    O.match(() => pipe(doneRef.set(true), I.apr(Pull.end)), Pull.fail),
                    Pull.emit
                  )
                )
              )
            )
          }
        })
      )
      return pull
    })
  )
}

/**
 * Unwraps `Exit` values and flatten chunks that also signify end-of-stream by failing with `None`.
 */
export function flattenTake<R, E, E1, A>(ma: Stream<R, E, Take.Take<E1, A>>): Stream<R, E | E1, A> {
  return pipe(ma, flattenExitOption, flattenChunks)
}

/**
 * Aggregates elements using the provided transducer until it signals completion, or the
 * delay signalled by the schedule has passed.
 *
 * This operator divides the stream into two asynchronous islands. Operators upstream
 * of this operator run on one fiber, while downstream operators run on another. Elements
 * will be aggregated by the transducer until the downstream fiber pulls the aggregated value,
 * or until the schedule's delay has passed.
 *
 * Aggregated elements will be fed into the schedule to determine the delays between
 * pulls.
 */
export function aggregateAsyncWithinEither<A, R1, E1, P, Q>(
  transducer: Transducer<R1, E1, A, P>,
  schedule: Schedule<R1, Chunk<P>, Q>
): <R, E>(ma: Stream<R, E, A>) => Stream<R & R1 & Has<Clock>, E | E1, E.Either<Q, P>> {
  return (ma) => aggregateAsyncWithinEither_(ma, transducer, schedule)
}

/**
 * Aggregates elements using the provided transducer until it signals completion, or the
 * delay signalled by the schedule has passed.
 *
 * This operator divides the stream into two asynchronous islands. Operators upstream
 * of this operator run on one fiber, while downstream operators run on another. Elements
 * will be aggregated by the transducer until the downstream fiber pulls the aggregated value,
 * or until the schedule's delay has passed.
 *
 * Aggregated elements will be fed into the schedule to determine the delays between
 * pulls.
 */
export function aggregateAsyncWithinEither_<R, E, A, R1, E1, P, Q>(
  ma: Stream<R, E, A>,
  transducer: Transducer<R1, E1, A, P>,
  schedule: Schedule<R1, Chunk<P>, Q>
): Stream<R & R1 & Has<Clock>, E | E1, E.Either<Q, P>> {
  return flattenTake(
    new Stream(
      M.gen(function* (_) {
        const pull         = yield* _(ma.proc)
        const push         = yield* _(transducer.push)
        const handoff      = yield* _(Ha.make<Take.Take<E, A>>())
        const raceNextTime = yield* _(Ref.make(false))
        const waitingFiber = yield* _(Ref.make<O.Option<Fiber<never, Take.Take<E | E1, A>>>>(O.None()))
        const sdriver      = yield* _(Sc.driver(schedule))
        const lastChunk    = yield* _(Ref.make<Chunk<P>>(C.empty()))

        const producer = pipe(
          pull,
          Take.fromPull,
          I.repeatWhileM((take) =>
            pipe(
              Ha.offer(take)(handoff),
              I.as(() => Ex.isSuccess(take))
            )
          )
        )

        const updateSchedule: I.URIO<R1 & Has<Clock>, O.Option<Q>> = pipe(
          lastChunk.get,
          I.bind(sdriver.next),
          I.match((_) => O.None(), O.Some)
        )

        const waitForProducer: I.URIO<R1, Take.Take<E | E1, A>> = pipe(
          waitingFiber,
          Ref.getAndSet(O.None()),
          I.bind(
            O.match(
              () => Ha.take(handoff),
              (fiber) => Fi.join(fiber)
            )
          )
        )

        const updateLastChunk = (take: Take.Take<E1, P>): I.UIO<void> => Take.tap_(take, lastChunk.set)

        const handleTake = (take: Take.Take<E | E1, A>): Pull.Pull<R1, E | E1, Take.Take<E1, E.Either<never, P>>> =>
          pipe(
            take,
            Take.matchM(
              () =>
                pipe(
                  push(O.None()),
                  I.map((ps) => [Take.chunk(C.map_(ps, E.Right)), Take.end])
                ),
              I.halt,
              (os) =>
                I.bind_(Take.fromPull(I.asSomeError(push(O.Some(os)))), (take) =>
                  I.as_(updateLastChunk(take), () => [Take.map_(take, E.Right)])
                )
            ),
            I.mapError(O.Some)
          )

        const go = (
          race: boolean
        ): I.IO<R & R1 & Has<Clock>, O.Option<E | E1>, Chunk<Take.Take<E1, E.Either<Q, P>>>> => {
          if (!race) {
            return pipe(waitForProducer, I.bind(handleTake), I.apl(raceNextTime.set(true)))
          } else {
            return I.raceWith_(
              updateSchedule,
              waitForProducer,
              (scheduleDone, producerWaiting) =>
                pipe(
                  I.done(scheduleDone),
                  I.bind(
                    O.match(
                      () =>
                        I.gen(function* (_) {
                          const lastQ = yield* _(
                            pipe(lastChunk.set(C.empty()), I.apr(I.orDie(sdriver.last)), I.apl(sdriver.reset))
                          )

                          const scheduleResult: Take.Take<E1, E.Either<Q, P>> = Ex.succeed(C.pure(E.Left(lastQ)))

                          const take = yield* _(
                            pipe(push(O.None()), I.asSomeError, Take.fromPull, I.tap(updateLastChunk))
                          )
                          yield* _(raceNextTime.set(false))
                          yield* _(waitingFiber.set(O.Some(producerWaiting)))
                          return [scheduleResult, Take.map_(take, E.Right)]
                        }),
                      (_) =>
                        I.gen(function* (_) {
                          const ps = yield* _(
                            pipe(push(O.None()), I.asSomeError, Take.fromPull, I.tap(updateLastChunk))
                          )
                          yield* _(raceNextTime.set(false))
                          yield* _(waitingFiber.set(O.Some(producerWaiting)))
                          return [Take.map_(ps, E.Right)]
                        })
                    )
                  )
                ),
              (producerDone, scheduleWaiting) =>
                I.apr_(Fi.interrupt(scheduleWaiting), handleTake(Ex.flatten(producerDone)))
            )
          }
        }

        yield* _(I.forkManaged(producer))

        return pipe(
          raceNextTime.get,
          I.bind(go),
          I.onInterrupt((_) => pipe(waitingFiber.get, I.bind(flow(O.map(Fi.interrupt), O.getOrElse(I.unit), I.asUnit))))
        )
      })
    )
  )
}

/**
 * Uses `aggregateAsyncWithinEither` but only returns the `Right` results.
 */
export function aggregateAsyncWithin<A, R1, E1, P>(
  transducer: Transducer<R1, E1, A, P>,
  schedule: Schedule<R1, Chunk<P>, any>
): <R, E>(ma: Stream<R, E, A>) => Stream<R & R1 & Has<Clock>, E | E1, P> {
  return (ma) => aggregateAsyncWithin_(ma, transducer, schedule)
}

/**
 * Uses `aggregateAsyncWithinEither` but only returns the `Right` results.
 */
export function aggregateAsyncWithin_<R, E, A, R1, E1, P>(
  ma: Stream<R, E, A>,
  transducer: Transducer<R1, E1, A, P>,
  schedule: Schedule<R1, Chunk<P>, any>
): Stream<R & R1 & Has<Clock>, E | E1, P> {
  return filterMap_(
    aggregateAsyncWithinEither_(ma, transducer, schedule),
    E.match(() => O.None(), O.Some)
  )
}

/**
 * Aggregates elements of this stream using the provided sink for as long
 * as the downstream operators on the stream are busy.
 *
 * This operator divides the stream into two asynchronous "islands". Operators upstream
 * of this operator run on one fiber, while downstream operators run on another. Whenever
 * the downstream fiber is busy processing elements, the upstream fiber will feed elements
 * into the sink until it signals completion.
 *
 * Any transducer can be used here, but see `Transducer.foldWeightedM` and `Transducer.foldUntilM` for
 * transducers that cover the common usecases.
 */
export function aggregateAsync<A, R1, E1, P>(
  transducer: Transducer<R1, E1, A, P>
): <R, E>(ma: Stream<R, E, A>) => Stream<R & R1 & Has<Clock>, E | E1, P> {
  return (ma) => aggregateAsync_(ma, transducer)
}

/**
 * Aggregates elements of this stream using the provided sink for as long
 * as the downstream operators on the stream are busy.
 *
 * This operator divides the stream into two asynchronous "islands". Operators upstream
 * of this operator run on one fiber, while downstream operators run on another. Whenever
 * the downstream fiber is busy processing elements, the upstream fiber will feed elements
 * into the sink until it signals completion.
 *
 * Any transducer can be used here, but see `Transducer.foldWeightedM` and `Transducer.foldUntilM` for
 * transducers that cover the common usecases.
 */
export function aggregateAsync_<R, E, A, R1, E1, P>(
  ma: Stream<R, E, A>,
  transducer: Transducer<R1, E1, A, P>
): Stream<R & R1 & Has<Clock>, E | E1, P> {
  return aggregateAsyncWithin_(ma, transducer, Sc.forever)
}

/**
 * Applies an aggregator to the stream, which converts one or more elements
 * of type `O` into elements of type `P`.
 */
export function aggregate_<R, E, A, R1, E1, P>(
  ma: Stream<R, E, A>,
  transducer: Transducer<R1, E1, A, P>
): Stream<R & R1, E | E1, P> {
  return new Stream(
    M.gen(function* (_) {
      const pull    = yield* _(ma.proc)
      const push    = yield* _(transducer.push)
      const doneRef = yield* _(Ref.make(false))

      const go: I.IO<R & R1, O.Option<E | E1>, Chunk<P>> = pipe(
        doneRef.get,
        I.bind((done) => {
          if (done) {
            return Pull.end
          } else {
            return pipe(
              pull,
              I.matchM(
                O.match(
                  (): I.IO<R1, O.Option<E | E1>, Chunk<P>> =>
                    pipe(doneRef.set(true), I.apr(I.asSomeError(push(O.None())))),
                  (e) => Pull.fail(e)
                ),
                (as) => I.asSomeError(push(O.Some(as)))
              ),
              I.bind((ps) => (C.isEmpty(ps) ? go : I.succeed(ps)))
            )
          }
        })
      )
      return go
    })
  )
}

/**
 * Applies an aggregator to the stream, which converts one or more elements
 * of type `O` into elements of type `P`.
 */
export function aggregate<R1, E1, A, P>(
  transducer: Transducer<R1, E1, A, P>
): <R, E>(ma: Stream<R, E, A>) => Stream<R & R1, E1 | E, P> {
  return (ma) => aggregate_(ma, transducer)
}

/**
 * More powerful version of `distributedWith`. This returns a function that will produce
 * new queues and corresponding indices.
 * You can also provide a function that will be executed after the final events are enqueued in all queues.
 * Shutdown of the queues is handled by the driver.
 * Downstream users can also shutdown queues manually. In this case the driver will
 * continue but no longer backpressure on them.
 */
export function distributedWithDynamic<E, A>(
  maximumLag: number,
  decide: (_: A) => I.UIO<(_: symbol) => boolean>,
  done: (_: Ex.Exit<O.Option<E>, never>) => I.UIO<any> = (_: any) => I.unit()
): <R>(ma: Stream<R, E, A>) => M.Managed<R, never, I.UIO<readonly [symbol, Queue.Dequeue<Ex.Exit<O.Option<E>, A>>]>> {
  return (ma) => distributedWithDynamic_(ma, maximumLag, decide, done)
}

/**
 * More powerful version of `distributedWith`. This returns a function that will produce
 * new queues and corresponding indices.
 * You can also provide a function that will be executed after the final events are enqueued in all queues.
 * Shutdown of the queues is handled by the driver.
 * Downstream users can also shutdown queues manually. In this case the driver will
 * continue but no longer backpressure on them.
 */
export function distributedWithDynamic_<R, E, A>(
  ma: Stream<R, E, A>,
  maximumLag: number,
  decide: (o: A) => I.UIO<(_: symbol) => boolean>,
  done: (_: Ex.Exit<O.Option<E>, never>) => I.UIO<any> = (_: any) => I.unit()
): M.Managed<R, never, I.UIO<readonly [symbol, Queue.Dequeue<Ex.Exit<O.Option<E>, A>>]>> {
  const offer = (queuesRef: Ref.URef<ReadonlyMap<symbol, Queue.Queue<Ex.Exit<O.Option<E>, A>>>>) => (o: A) =>
    I.gen(function* (_) {
      const shouldProcess = yield* _(decide(o))
      const queues        = yield* _(
        pipe(
          queuesRef.get,
          I.map((m) => m.entries())
        )
      )
      return yield* _(
        pipe(
          queues,
          I.foldl(C.empty<symbol>(), (b, [id, queue]) => {
            if (shouldProcess(id)) {
              return pipe(
                queue.offer(Ex.succeed(o)),
                I.matchCauseM(
                  (c) => (Ca.interrupted(c) ? I.succeed(C.append(id)(b)) : I.halt(c)),
                  () => I.succeed(b)
                )
              )
            } else {
              return I.succeed(b)
            }
          }),
          I.bind((ids) => (C.isNonEmpty(ids) ? Ref.update_(queuesRef, Map.removeMany(ids)) : I.unit()))
        )
      )
    })

  return M.gen(function* (_) {
    const queuesRef = yield* _(
      pipe(
        Ref.make(Map.empty<symbol, Queue.Queue<Ex.Exit<O.Option<E>, A>>>()),
        M.make((_) => I.bind_(_.get, (qs) => I.foreach_(qs.values(), (q) => q.shutdown)))
      )
    )
    const add       = yield* _(
      M.gen(function* (_) {
        const queuesLock = yield* _(Semaphore.make(1))
        const newQueue   = yield* _(
          Ref.make<I.UIO<readonly [symbol, Queue.Queue<Ex.Exit<O.Option<E>, A>>]>>(
            I.gen(function* (_) {
              const queue = yield* _(Queue.makeBounded<Ex.Exit<O.Option<E>, A>>(maximumLag))
              const id    = Symbol() as symbol
              yield* _(pipe(queuesRef, Ref.update(Map.insert(id, queue))))
              return tuple(id, queue)
            })
          )
        )
        const finalize = (endTake: Ex.Exit<O.Option<E>, never>): I.UIO<void> =>
          Semaphore.withPermit(queuesLock)(
            pipe(
              I.gen(function* (_) {
                const queue = yield* _(Queue.makeBounded<Ex.Exit<O.Option<E>, A>>(1))
                yield* _(queue.offer(endTake))
                const id = Symbol() as symbol
                yield* _(pipe(queuesRef, Ref.update(Map.insert(id, queue))))
                return tuple(id, queue)
              }),
              newQueue.set,
              I.bind(() =>
                I.gen(function* (_) {
                  const queues = yield* _(
                    pipe(
                      queuesRef.get,
                      I.map((m) => [...m.values()])
                    )
                  )
                  yield* _(
                    I.foreach_(queues, (queue) =>
                      pipe(
                        queue.offer(endTake),
                        I.catchSomeCause((c) => (Ca.interrupted(c) ? O.Some(I.unit()) : O.None<I.UIO<void>>()))
                      )
                    )
                  )
                  yield* _(done(endTake))
                })
              ),
              I.asUnit
            )
          )

        yield* _(
          pipe(
            ma,
            foreachManaged(offer(queuesRef)),
            M.matchCauseM(flow(Ca.map(O.Some), Ex.halt, finalize, I.toManaged()), () =>
              pipe(O.None(), Ex.fail, finalize, I.toManaged())
            ),
            M.fork
          )
        )
        return Semaphore.withPermit(queuesLock)(I.flatten(newQueue.get))
      })
    )
    return add
  })
}

/**
 * More powerful version of `broadcast`. Allows to provide a function that determines what
 * queues should receive which elements. The decide function will receive the indices of the queues
 * in the resulting list.
 */
export function distributedWith<A>(
  n: number,
  maximumLag: number,
  decide: (_: A) => I.UIO<(_: number) => boolean>
): <R, E>(stream: Stream<R, E, A>) => M.Managed<R, never, Chunk<Queue.Dequeue<Ex.Exit<O.Option<E>, A>>>> {
  return (stream) => distributedWith_(stream, n, maximumLag, decide)
}

/**
 * More powerful version of `broadcast`. Allows to provide a function that determines what
 * queues should receive which elements. The decide function will receive the indices of the queues
 * in the resulting list.
 */
export function distributedWith_<R, E, A>(
  ma: Stream<R, E, A>,
  n: number,
  maximumLag: number,
  decide: (_: A) => I.UIO<(_: number) => boolean>
): M.Managed<R, never, Chunk<Queue.Dequeue<Ex.Exit<O.Option<E>, A>>>> {
  return pipe(
    P.make<never, (_: A) => I.UIO<(_: symbol) => boolean>>(),
    M.fromEffect,
    M.bind((prom) =>
      pipe(
        distributedWithDynamic_(
          ma,
          maximumLag,
          (o) => I.bind_(prom.await, (_) => _(o)),
          (_) => I.unit()
        ),
        M.bind((next) =>
          pipe(
            I.collectAll(
              pipe(
                C.range(0, n),
                C.map((id) => I.map_(next, ([key, queue]) => [[key, id], queue] as const))
              )
            ),
            I.bind((entries) => {
              const [mappings, queues] = C.foldr_(
                entries,
                [Map.empty<symbol, number>(), C.empty<Queue.Dequeue<Ex.Exit<O.Option<E>, A>>>()] as const,
                ([mapping, queue], [mappings, queues]) => [
                  Map.insert_(mappings, mapping[0], mapping[1]),
                  C.append_(queues, queue)
                ]
              )
              return pipe(
                prom.succeed((o: A) => I.map_(decide(o), (f) => (key: symbol) => f(mappings.get(key) as number))),
                I.as(() => queues)
              )
            }),
            M.fromEffect
          )
        )
      )
    )
  )
}

/**
 * Converts the stream to a managed list of queues. Every value will be replicated to every queue with the
 * slowest queue being allowed to buffer `maximumLag` chunks before the driver is backpressured.
 * The downstream queues will be provided with chunks in the same order they are returned, so
 * the fastest queue might have seen up to (`maximumLag` + 1) chunks more than the slowest queue if it
 * has a lower index than the slowest queue.
 *
 * Queues can unsubscribe from upstream by shutting down.
 */
export function broadcastedQueues(
  n: number,
  maximumLag: number
): <R, E, A>(ma: Stream<R, E, A>) => M.Managed<R, never, Chunk<Queue.Dequeue<Ex.Exit<O.Option<E>, A>>>> {
  return (ma) => broadcastedQueues_(ma, n, maximumLag)
}

/**
 * Converts the stream to a managed list of queues. Every value will be replicated to every queue with the
 * slowest queue being allowed to buffer `maximumLag` chunks before the driver is backpressured.
 * The downstream queues will be provided with chunks in the same order they are returned, so
 * the fastest queue might have seen up to (`maximumLag` + 1) chunks more than the slowest queue if it
 * has a lower index than the slowest queue.
 *
 * Queues can unsubscribe from upstream by shutting down.
 */
export function broadcastedQueues_<R, E, A>(
  ma: Stream<R, E, A>,
  n: number,
  maximumLag: number
): M.Managed<R, never, Chunk<Queue.Dequeue<Ex.Exit<O.Option<E>, A>>>> {
  const decider = I.succeed((_: number) => true)
  return distributedWith_(ma, n, maximumLag, (_) => decider)
}

/**
 * Fan out the stream, producing a list of streams that have the same elements as this stream.
 * The driver stream will only ever advance of the `maximumLag` chunks before the
 * slowest downstream stream.
 */
export function broadcast(
  n: number,
  maximumLag: number
): <R, E, A>(ma: Stream<R, E, A>) => M.Managed<R, never, Chunk<Stream<unknown, E, A>>> {
  return (ma) => broadcast_(ma, n, maximumLag)
}

/**
 * Fan out the stream, producing a list of streams that have the same elements as this stream.
 * The driver stream will only ever advance of the `maximumLag` chunks before the
 * slowest downstream stream.
 */
export function broadcast_<R, E, A>(
  ma: Stream<R, E, A>,
  n: number,
  maximumLag: number
): M.Managed<R, never, Chunk<Stream<unknown, E, A>>> {
  return pipe(broadcastedQueues_(ma, n, maximumLag), M.map(C.map((q) => flattenExitOption(fromQueueWithShutdown(q)))))
}

/**
 * Converts the stream to a managed dynamic amount of queues. Every chunk will be replicated to every queue with the
 * slowest queue being allowed to buffer `maximumLag` chunks before the driver is backpressured.
 * The downstream queues will be provided with chunks in the same order they are returned, so
 * the fastest queue might have seen up to (`maximumLag` + 1) chunks more than the slowest queue if it
 * has a lower index than the slowest queue.
 *
 * Queues can unsubscribe from upstream by shutting down.
 */
export function broadcastedQueuesDynamic_<R, E, A>(
  ma: Stream<R, E, A>,
  maximumLag: number
): M.Managed<R, never, I.UIO<Queue.Dequeue<Ex.Exit<O.Option<E>, A>>>> {
  return M.map_(
    distributedWithDynamic_(
      ma,
      maximumLag,
      () => I.succeed((_) => true),
      () => I.unit()
    ),
    I.map(([_, queue]) => queue)
  )
}

/**
 * Converts the stream to a managed dynamic amount of queues. Every chunk will be replicated to every queue with the
 * slowest queue being allowed to buffer `maximumLag` chunks before the driver is backpressured.
 * The downstream queues will be provided with chunks in the same order they are returned, so
 * the fastest queue might have seen up to (`maximumLag` + 1) chunks more than the slowest queue if it
 * has a lower index than the slowest queue.
 *
 * Queues can unsubscribe from upstream by shutting down.
 */
export function broadcastedQueuesDynamic(
  maximumLag: number
): <R, E, A>(ma: Stream<R, E, A>) => M.Managed<R, never, I.UIO<Queue.Dequeue<Ex.Exit<O.Option<E>, A>>>> {
  return (ma) => broadcastedQueuesDynamic_(ma, maximumLag)
}

/**
 * Fan out the stream, producing a dynamic number of streams that have the same elements as this stream.
 * The driver stream will only ever advance of the `maximumLag` chunks before the
 * slowest downstream stream.
 */
export function broadcastDynamic_<R, E, A>(
  ma: Stream<R, E, A>,
  maximumLag: number
): M.Managed<R, never, I.UIO<Stream<unknown, E, A>>> {
  return pipe(
    distributedWithDynamic_(
      ma,
      maximumLag,
      (_) => I.succeed(constTrue),
      (_) => I.unit()
    ),
    M.map(I.map(([, queue]) => queue)),
    M.map(I.map(flow(fromQueueWithShutdown, flattenExitOption)))
  )
}

/**
 * Fan out the stream, producing a dynamic number of streams that have the same elements as this stream.
 * The driver stream will only ever advance of the `maximumLag` chunks before the
 * slowest downstream stream.
 */
export function broadcastDynamic(
  maximumLag: number
): <R, E, A>(ma: Stream<R, E, A>) => M.Managed<R, never, I.UIO<Stream<unknown, E, A>>> {
  return (ma) => broadcastDynamic_(ma, maximumLag)
}

/**
 * Allows a faster producer to progress independently of a slower consumer by buffering
 * up to `capacity` chunks in a queue.
 *
 * @note Prefer capacities that are powers of 2 for better performance.
 */
export function buffer_<R, E, A>(ma: Stream<R, E, A>, capacity: number): Stream<R, E, A> {
  return new Stream(
    M.gen(function* (_) {
      const doneRef = yield* _(Ref.make(false))
      const queue   = yield* _(toQueue_(ma, capacity))
      return pipe(
        doneRef.get,
        I.bind((done) => {
          if (done) {
            return Pull.end
          } else {
            return pipe(
              queue.take,
              I.bind(I.done),
              I.catchSome(O.match(() => pipe(doneRef.set(true), I.apr(Pull.end), O.Some), flow(O.Some, I.fail, O.Some)))
            )
          }
        })
      )
    })
  )
}

/**
 * Allows a faster producer to progress independently of a slower consumer by buffering
 * up to `capacity` chunks in a queue.
 *
 * @note Prefer capacities that are powers of 2 for better performance.
 */
export function buffer(capacity: number): <R, E, A>(ma: Stream<R, E, A>) => Stream<R, E, A> {
  return (ma) => buffer_(ma, capacity)
}

/**
 * Allows a faster producer to progress independently of a slower consumer by buffering
 * elements into an unbounded queue.
 */
export function bufferUnbounded<R, E, A>(ma: Stream<R, E, A>): Stream<R, E, A> {
  return new Stream(
    M.gen(function* (_) {
      const doneRef = yield* _(Ref.makeManaged(false))
      const queue   = yield* _(toQueueUnbounded(ma))
      return pipe(
        doneRef.get,
        I.bind((done) => {
          if (done) {
            return Pull.end
          } else {
            return pipe(
              queue.take,
              I.bind(Take.matchM(() => pipe(doneRef.set(true), I.apr(Pull.end)), Pull.halt, Pull.emitChunk))
            )
          }
        })
      )
    })
  )
}

function bufferSignal_<R, E, A>(
  ma: Stream<R, E, A>,
  queue: Queue.Queue<[Take.Take<E, A>, P.Promise<never, void>]>
): M.Managed<R, never, I.IO<R, O.Option<E>, Chunk<A>>> {
  return M.gen(function* (_) {
    const as    = yield* _(ma.proc)
    const start = yield* _(P.make<never, void>())
    yield* _(start.succeed(undefined))
    const ref     = yield* _(Ref.make(start))
    const doneRef = yield* _(Ref.make(false))
    const offer   = (take: Take.Take<E, A>): I.UIO<void> =>
      Ex.match_(
        take,
        (_) =>
          I.gen(function* ($) {
            const latch = yield* $(ref.get)
            yield* $(latch.await)
            const p = yield* $(P.make<never, void>())
            yield* $(queue.offer([take, p]))
            yield* $(ref.set(p))
            yield* $(p.await)
          }),
        (_) =>
          I.gen(function* ($) {
            const p     = yield* $(P.make<never, void>())
            const added = yield* $(queue.offer([take, p]))
            yield* $(I.when_(ref.set(p), () => added))
          })
      )
    const upstream = pipe(
      Take.fromPull(as),
      I.tap(offer),
      I.repeatWhile((take) => take !== Take.end),
      I.asUnit
    )
    yield* _(M.fork(I.toManaged_(upstream)))
    return pipe(
      doneRef.get,
      I.bind((done) => {
        if (done) {
          return Pull.end
        } else {
          return pipe(
            queue.take,
            I.bind(([take, p]) =>
              pipe(
                p.succeed(undefined),
                I.apr(I.when(() => take === Take.end)(doneRef.set(true))),
                I.apr(Take.done(take))
              )
            )
          )
        }
      })
    )
  })
}

/**
 * Allows a faster producer to progress independently of a slower consumer by buffering
 * up to `capacity` elements in a sliding queue.
 *
 * @note Prefer capacities that are powers of 2 for better performance.
 */
export function bufferSliding_<R, E, A>(ma: Stream<R, E, A>, capacity = 2): Stream<R, E, A> {
  return new Stream(
    M.gen(function* (_) {
      const queue = yield* _(
        I.toManaged_(Queue.makeSliding<[Take.Take<E, A>, P.Promise<never, void>]>(capacity), (q) => q.shutdown)
      )
      return yield* _(bufferSignal_(ma, queue))
    })
  )
}

/**
 * Allows a faster producer to progress independently of a slower consumer by buffering
 * up to `capacity` elements in a sliding queue.
 *
 * @note Prefer capacities that are powers of 2 for better performance.
 */
export function bufferSliding(capacity = 2): <R, E, A>(ma: Stream<R, E, A>) => Stream<R, E, A> {
  return (ma) => bufferSliding_(ma, capacity)
}

/**
 * Allows a faster producer to progress independently of a slower consumer by buffering
 * up to `capacity` elements in a dropping queue.
 *
 * @note Prefer capacities that are powers of 2 for better performance.
 */
export function bufferDropping_<R, E, A>(ma: Stream<R, E, A>, capacity = 2): Stream<R, E, A> {
  return new Stream(
    M.gen(function* (_) {
      const queue = yield* _(
        I.toManaged_(Queue.makeDropping<[Take.Take<E, A>, P.Promise<never, void>]>(capacity), (q) => q.shutdown)
      )
      return yield* _(bufferSignal_(ma, queue))
    })
  )
}

/**
 * Allows a faster producer to progress independently of a slower consumer by buffering
 * up to `capacity` elements in a dropping queue.
 *
 * @note Prefer capacities that are powers of 2 for better performance.
 */
export function bufferDropping(capacity = 2): <R, E, A>(ma: Stream<R, E, A>) => Stream<R, E, A> {
  return (ma) => bufferSliding_(ma, capacity)
}

/**
 * Switches over to the stream produced by the provided function in case this one
 * fails. Allows recovery from all causes of failure, including interruption if the
 * stream is uninterruptible.
 */
export function catchAllCause_<R, E, A, R1, E1, B>(
  stream: Stream<R, E, A>,
  f: (e: Ca.Cause<E>) => Stream<R1, E1, B>
): Stream<R & R1, E1, B | A> {
  type NotStarted = { _tag: 'NotStarted' }
  type Self<E0> = { _tag: 'Self', pull: Pull.Pull<R, E0, A> }
  type Other = { _tag: 'Other', pull: Pull.Pull<R1, E1, B> }
  type State<E0> = NotStarted | Self<E0> | Other
  return new Stream<R & R1, E1, A | B>(
    M.gen(function* (_) {
      const finalizerRef = yield* _(M.finalizerRef(RM.noopFinalizer))
      const stateRef     = yield* _(
        Ref.make<State<E>>({ _tag: 'NotStarted' })
      )

      const closeCurrent = (cause: Ca.Cause<any>) =>
        pipe(
          finalizerRef,
          Ref.getAndSet(RM.noopFinalizer),
          I.bind((f) => f(Ex.halt(cause))),
          I.makeUninterruptible
        )

      const open = <R, E0, O>(stream: Stream<R, E0, O>) => (asState: (_: Pull.Pull<R, E0, O>) => State<E>) =>
        I.uninterruptibleMask(({ restore }) =>
          pipe(
            RM.make,
            I.bind((releaseMap) =>
              pipe(
                finalizerRef.set((exit) => M.releaseAll(exit, sequential)(releaseMap)),
                I.bind(() =>
                  pipe(
                    restore(stream.proc.io),
                    I.gives((_: R) => [_, releaseMap] as [R, RM.ReleaseMap]),
                    I.map(([_, __]) => __),
                    I.tap((pull) => stateRef.set(asState(pull)))
                  )
                )
              )
            )
          )
        )

      const failover = (cause: Ca.Cause<Option<E>>) =>
        pipe(
          cause,
          Ca.sequenceCauseOption,
          O.match(
            () => I.fail(O.None()),
            (cause) =>
              pipe(
                closeCurrent(cause),
                I.bind(() =>
                  open(f(cause))((pull) => ({
                    _tag: 'Other',
                    pull
                  }))
                ),
                I.flatten
              )
          )
        )

      const pull = pipe(
        stateRef.get,
        I.bind((s) => {
          switch (s._tag) {
            case 'NotStarted': {
              return pipe(
                open(stream)((pull) => ({ _tag: 'Self', pull })),
                I.flatten,
                I.catchAllCause(failover)
              )
            }
            case 'Self': {
              return pipe(s.pull, I.catchAllCause(failover))
            }
            case 'Other': {
              return s.pull
            }
          }
        })
      )
      return pull
    })
  )
}

/**
 * Switches over to the stream produced by the provided function in case this one
 * fails. Allows recovery from all causes of failure, including interruption if the
 * stream is uninterruptible.
 */
export function catchAllCause<E, R1, E1, B>(
  f: (e: Ca.Cause<E>) => Stream<R1, E1, B>
): <R, A>(stream: Stream<R, E, A>) => Stream<R & R1, E1, B | A> {
  return (stream) => catchAllCause_(stream, f)
}

/**
 * Switches over to the stream produced by the provided function in case this one
 * fails with a typed error.
 */
export function catchAll_<R, E, A, R1, E1, A1>(
  ma: Stream<R, E, A>,
  f: (e: E) => Stream<R1, E1, A1>
): Stream<R & R1, E1, A | A1> {
  return catchAllCause_(ma, flow(Ca.failureOrCause, E.match(f, halt)))
}

/**
 * Switches over to the stream produced by the provided function in case this one
 * fails with a typed error.
 */
export function catchAll<E, R1, E1, A1>(
  f: (e: E) => Stream<R1, E1, A1>
): <R, A>(ma: Stream<R, E, A>) => Stream<R & R1, E1, A | A1> {
  return (ma) => catchAll_(ma, f)
}

/**
 * Switches over to the stream produced by the provided function in case this one
 * fails with some typed error.
 */
export function catchSome_<R, E, A, R1, E1, A1>(
  ma: Stream<R, E, A>,
  f: (e: E) => Option<Stream<R1, E1, A1>>
): Stream<R & R1, E | E1, A | A1> {
  return catchAll_(ma, (e) => O.match_(f(e), (): Stream<R & R1, E | E1, A | A1> => fail(e), identity))
}

/**
 * Switches over to the stream produced by the provided function in case this one
 * fails with some typed error.
 */
export function catchSome<E, R1, E1, A1>(
  f: (e: E) => Option<Stream<R1, E1, A1>>
): <R, A>(ma: Stream<R, E, A>) => Stream<R & R1, E | E1, A | A1> {
  return (ma) => catchSome_(ma, f)
}

/**
 * Switches over to the stream produced by the provided function in case this one
 * fails with some errors. Allows recovery from all causes of failure, including interruption if the
 * stream is uninterruptible.
 */
export function catchSomeCause_<R, E, A, R1, E1, A1>(
  ma: Stream<R, E, A>,
  f: (cause: Ca.Cause<E>) => Option<Stream<R1, E1, A1>>
): Stream<R & R1, E | E1, A | A1> {
  return catchAllCause_(ma, (cause) => O.match_(f(cause), (): Stream<R & R1, E | E1, A | A1> => halt(cause), identity))
}

/**
 * Switches over to the stream produced by the provided function in case this one
 * fails with some errors. Allows recovery from all causes of failure, including interruption if the
 * stream is uninterruptible.
 */
export function catchSomeCause<E, R1, E1, A1>(
  f: (cause: Ca.Cause<E>) => Option<Stream<R1, E1, A1>>
): <R, A>(ma: Stream<R, E, A>) => Stream<R & R1, E | E1, A | A1> {
  return (ma) => catchSomeCause_(ma, f)
}

/**
 * Maps each element of this stream to another stream and returns the
 * non-deterministic merge of those streams, executing up to `n` inner streams
 * concurrently. Up to `outputBuffer` elements of the produced streams may be
 * buffered in memory by this operator.
 */
export function bindPar_<R, E, A, R1, E1, A1>(
  ma: Stream<R, E, A>,
  f: (o: A) => Stream<R1, E1, A1>,
  n: number,
  outputBuffer = 16
) {
  return new Stream(
    M.withChildren((getChildren) =>
      M.gen(function* (_) {
        const outQueue     = yield* _(
          I.toManaged_(
            Queue.makeBounded<I.IO<R1, O.Option<E | E1>, Chunk<A1>>>(outputBuffer),
            (q) => q.shutdown
          )
        )
        const permits      = yield* _(Semaphore.make(n))
        const innerFailure = yield* _(P.make<Ca.Cause<E1>, never>())
        // - The driver stream forks an inner fiber for each stream created
        //   by f, with an upper bound of n concurrent fibers, enforced by the semaphore.
        //   - On completion, the driver stream tries to acquire all permits to verify
        //     that all inner fibers have finished.
        //     - If one of them failed (signalled by a promise), all other fibers are interrupted
        //     - If they all succeeded, Take.End is enqueued
        //   - On error, the driver stream interrupts all inner fibers and emits a
        //     Take.Fail value
        //   - Interruption is handled by running the finalizers which take care of cleanup
        // - Inner fibers enqueue Take values from their streams to the output queue
        //   - On error, an inner fiber enqueues a Take.Fail value and signals its failure
        //     with a promise. The driver will pick that up and interrupt all other fibers.
        //   - On interruption, an inner fiber does nothing
        //   - On completion, an inner fiber does nothing
        yield* _(
          pipe(
            foreachManaged_(ma, (o) =>
              I.gen(function* (_) {
                const latch       = yield* _(P.make<never, void>())
                const innerStream = pipe(
                  Semaphore.withPermitManaged(permits),
                  managed,
                  tap(() => latch.succeed(undefined)),
                  bind(() => f(o)),
                  foreachChunk(flow(I.succeed, outQueue.offer, I.asUnit)),
                  I.matchCauseM(
                    (cause) => pipe(cause, Pull.halt, outQueue.offer, I.apr(innerFailure.fail(cause)), I.asUnit),
                    () => I.unit()
                  )
                )
                yield* _(I.fork(innerStream))
                yield* _(latch.await)
              })
            ),
            M.matchCauseM(
              (cause) =>
                pipe(
                  getChildren,
                  I.bind(Fi.interruptAll),
                  I.apr(I.asUnit(outQueue.offer(Pull.halt(cause)))),
                  I.toManaged()
                ),
              () =>
                pipe(
                  innerFailure.await,
                  I.makeInterruptible,
                  I.raceWith(
                    Semaphore.withPermits(n, permits)(I.makeInterruptible(I.unit())),
                    (_, permitsAcquisition) =>
                      pipe(getChildren, I.bind(Fi.interruptAll), I.apr(I.asUnit(Fi.interrupt(permitsAcquisition)))),
                    (_, failureAwait) => pipe(outQueue.offer(Pull.end), I.apr(I.asUnit(Fi.interrupt(failureAwait))))
                  ),
                  I.toManaged()
                )
            ),
            M.fork
          )
        )
        return I.flatten(outQueue.take)
      })
    )
  )
}

/**
 * Maps each element of this stream to another stream and returns the
 * non-deterministic merge of those streams, executing up to `n` inner streams
 * concurrently. Up to `outputBuffer` elements of the produced streams may be
 * buffered in memory by this operator.
 */
export function bindPar<A, R1, E1, A1>(
  f: (o: A) => Stream<R1, E1, A1>,
  n: number,
  outputBuffer = 16
): <R, E>(stream: Stream<R, E, A>) => Stream<R & R1, E | E1, A1> {
  return (stream) => bindPar_(stream, f, n, outputBuffer)
}

/**
 * Maps each element of this stream to another stream and returns the non-deterministic merge
 * of those streams, executing up to `n` inner streams concurrently. When a new stream is created
 * from an element of the source stream, the oldest executing stream is cancelled. Up to `bufferSize`
 * elements of the produced streams may be buffered in memory by this operator.
 */
export function bindParSwitch_(n: number, bufferSize = 16) {
  return <R, E, A, R1, E1, B>(ma: Stream<R, E, A>, f: (o: A) => Stream<R1, E1, B>): Stream<R & R1, E | E1, B> => {
    return new Stream(
      M.withChildren((getChildren) =>
        M.gen(function* (_) {
          const outQueue     = yield* _(
            I.toManaged_(Queue.makeBounded<I.IO<R1, O.Option<E | E1>, Chunk<B>>>(bufferSize), (q) => q.shutdown)
          )
          const permits      = yield* _(Semaphore.make(n))
          const innerFailure = yield* _(P.make<Ca.Cause<E1>, never>())
          const cancelers    = yield* _(I.toManaged_(Queue.makeBounded<P.Promise<never, void>>(n), (q) => q.shutdown))
          yield* _(
            pipe(
              ma,
              foreachManaged((o) =>
                I.gen(function* (_) {
                  const canceler = yield* _(P.make<never, void>())
                  const latch    = yield* _(P.make<never, void>())
                  const size     = yield* _(cancelers.size)
                  if (size < n) {
                    yield* _(I.unit())
                  } else {
                    yield* _(
                      pipe(
                        cancelers.take,
                        I.bind(() => I.succeed(undefined)),
                        I.asUnit
                      )
                    )
                  }
                  yield* _(cancelers.offer(canceler))
                  const innerStream = pipe(
                    Semaphore.withPermitManaged(permits),
                    managed,
                    tap(() => latch.succeed(undefined)),
                    bind(() => f(o)),
                    foreachChunk(flow(I.succeed, outQueue.offer, I.asUnit)),
                    I.matchCauseM(
                      (cause) => pipe(cause, Pull.halt, outQueue.offer, I.apr(innerFailure.fail(cause)), I.asUnit),
                      () => I.unit()
                    )
                  )
                  yield* _(I.fork(I.race_(innerStream, canceler.await)))
                  yield* _(latch.await)
                })
              ),
              M.matchCauseM(
                (cause) =>
                  pipe(getChildren, I.bind(Fi.interruptAll), I.apr(outQueue.offer(Pull.halt(cause))), I.toManaged()),
                () =>
                  pipe(
                    innerFailure.await,
                    I.raceWith(
                      Semaphore.withPermits(n, permits)(I.unit()),
                      (_, permitsAcquisition) =>
                        pipe(getChildren, I.bind(Fi.interruptAll), I.apr(I.asUnit(Fi.interrupt(permitsAcquisition)))),
                      (_, failureAwait) => pipe(outQueue.offer(Pull.end), I.apr(I.asUnit(Fi.interrupt(failureAwait))))
                    ),
                    I.toManaged()
                  )
              ),
              M.fork
            )
          )
          return I.flatten(outQueue.take)
        })
      )
    )
  }
}

/**
 * Maps each element of this stream to another stream and returns the non-deterministic merge
 * of those streams, executing up to `n` inner streams concurrently. When a new stream is created
 * from an element of the source stream, the oldest executing stream is cancelled. Up to `bufferSize`
 * elements of the produced streams may be buffered in memory by this operator.
 */
export function bindParSwitch(n: number, bufferSize = 16) {
  return <A, R1, E1, B>(f: (a: A) => Stream<R1, E1, B>) => <R, E>(ma: Stream<R, E, A>): Stream<R & R1, E | E1, B> =>
    bindParSwitch_(n, bufferSize)(ma, f)
}

/**
 * Re-chunks the elements of the stream into chunks of `n` elements each.
 * The last chunk might contain less than `n` elements
 */
export function chunkN_<R, E, A>(ma: Stream<R, E, A>, n: number): Stream<R, E, A> {
  interface State<X> {
    readonly buffer: Chunk<X>
    readonly done: boolean
  }

  function emitOrAccumulate(
    buffer: Chunk<A>,
    done: boolean,
    ref: Ref.URef<State<A>>,
    pull: I.IO<R, Option<E>, Chunk<A>>
  ): I.IO<R, Option<E>, Chunk<A>> {
    if (buffer.length < n) {
      if (done) {
        if (C.isEmpty(buffer)) {
          return Pull.end
        } else {
          return I.apr_(
            ref.set({
              buffer: C.empty(),
              done: true
            }),
            Pull.emitChunk(buffer)
          )
        }
      } else {
        return I.matchM_(
          pull,
          O.match(() => emitOrAccumulate(buffer, true, ref, pull), Pull.fail),
          (ch) => emitOrAccumulate(C.concat_(buffer, ch), false, ref, pull)
        )
      }
    } else {
      const [chunk, leftover] = C.splitAt_(buffer, n)
      return I.apr_(ref.set({ buffer: leftover, done }), Pull.emitChunk(chunk))
    }
  }

  if (n < 1) {
    return halt(Ca.die(new Error('chunkN: n must be at least 1')))
  } else {
    return new Stream(
      M.gen(function* (_) {
        const ref = yield* _(
          Ref.make<State<A>>({ buffer: C.empty(), done: false })
        )
        const p   = yield* _(ma.proc)
        return I.bind_(ref.get, (s) => emitOrAccumulate(s.buffer, s.done, ref, p))
      })
    )
  }
}

/**
 * Re-chunks the elements of the stream into chunks of `n` elements each.
 * The last chunk might contain less than `n` elements
 */
export function chunkN(n: number): <R, E, A>(ma: Stream<R, E, A>) => Stream<R, E, A> {
  return (ma) => chunkN_(ma, n)
}

/**
 * Filters any `Right` values.
 */
export function collectLeft<R, E, L, A>(ma: Stream<R, E, E.Either<L, A>>): Stream<R, E, L> {
  return filterMap_(ma, O.getLeft)
}

/**
 * Filters any `Left` values.
 */
export function collectRight<R, E, L, A>(ma: Stream<R, E, E.Either<L, A>>): Stream<R, E, A> {
  return filterMap_(ma, O.getRight)
}

/**
 * Filters any 'None' values.
 */
export function collectSome<R, E, A>(ma: Stream<R, E, O.Option<A>>): Stream<R, E, A> {
  return filterMap_(ma, identity)
}

/**
 * Filters any `Exit.Failure` values.
 */
export function collectSuccess<R, E, L, A>(ma: Stream<R, E, Ex.Exit<L, A>>): Stream<R, E, A> {
  return filterMap_(ma, (ex) => (Ex.isSuccess(ex) ? O.Some(ex.value) : O.None()))
}

/**
 * Transforms all elements of the stream for as long as the specified partial function is defined.
 */
export function collectWhile_<R, E, A, B>(ma: Stream<R, E, A>, f: (a: A) => O.Option<B>): Stream<R, E, B> {
  return new Stream(
    M.gen(function* (_) {
      const chunks  = yield* _(ma.proc)
      const doneRef = yield* _(Ref.makeManaged(false))
      return pipe(
        doneRef.get,
        I.bind((done) => {
          if (done) {
            return Pull.end
          } else {
            return I.gen(function* (_) {
              const chunk     = yield* _(chunks)
              const remaining = C.filterMap_(chunk, f)
              yield* _(
                pipe(
                  doneRef.set(true),
                  I.when(() => remaining.length < chunk.length)
                )
              )
              return remaining
            })
          }
        })
      )
    })
  )
}

/**
 * Transforms all elements of the stream for as long as the specified partial function is defined.
 */
export function collectWhile<A, B>(f: (o: A) => O.Option<B>): <R, E>(ma: Stream<R, E, A>) => Stream<R, E, B> {
  return (ma) => collectWhile_(ma, f)
}

/**
 * Terminates the stream when encountering the first `Right`.
 */
export function collectWhileLeft<R, E, L, A>(ma: Stream<R, E, E.Either<L, A>>): Stream<R, E, L> {
  return collectWhile_(ma, O.getLeft)
}

/**
 * Terminates the stream when encountering the first `Left`.
 */
export function collectWhileRight<R, E, L, A>(ma: Stream<R, E, E.Either<L, A>>): Stream<R, E, A> {
  return collectWhile_(ma, O.getRight)
}

/**
 * Terminates the stream when encountering the first `None`.
 */
export function collectWhileSome<R, E, A>(ma: Stream<R, E, O.Option<A>>): Stream<R, E, A> {
  return collectWhile_(ma, identity)
}

/**
 * Terminates the stream when encountering the first `Exit.Failure`.
 */
export function collectWhileSuccess<R, E, L, A>(ma: Stream<R, E, Ex.Exit<L, A>>): Stream<R, E, A> {
  return collectWhile_(ma, (ex) => (Ex.isSuccess(ex) ? O.Some(ex.value) : O.None()))
}

/**
 * Effectfully transforms all elements of the stream for as long as the specified partial function is defined.
 */
export function collectWhileM_<R, E, A, R1, E1, B>(
  ma: Stream<R, E, A>,
  f: (o: A) => O.Option<I.IO<R1, E1, B>>
): Stream<R & R1, E | E1, B> {
  return new Stream(
    M.gen(function* (_) {
      const os      = yield* _(M.mapM_(ma.proc, BPull.make))
      const doneRef = yield* _(Ref.makeManaged(false))
      return pipe(
        doneRef.get,
        I.bind((done) => {
          if (done) {
            return Pull.end
          } else {
            return pipe(
              BPull.pullElement(os),
              I.bind(
                flow(
                  f,
                  O.match(() => pipe(doneRef.set(true), I.apr(Pull.end)), I.bimap(O.Some, C.pure))
                )
              )
            ) as I.IO<R & R1, O.Option<E | E1>, Chunk<B>>
          }
        })
      )
    })
  )
}

/**
 * Effectfully transforms all elements of the stream for as long as the specified partial function is defined.
 */
export function collectWhileM<A, R1, E1, B>(
  f: (o: A) => O.Option<I.IO<R1, E1, B>>
): <R, E>(ma: Stream<R, E, A>) => Stream<R & R1, E | E1, B> {
  return (ma) => collectWhileM_(ma, f)
}

/**
 * Combines the elements from this stream and the specified stream by repeatedly applying the
 * function `f` to extract an element using both sides and conceptually "offer"
 * it to the destination stream. `f` can maintain some internal state to control
 * the combining process, with the initial state being specified by `s`.
 *
 * Where possible, prefer `combineChunks` for a more efficient implementation.
 */
export function combine_<R, E, A, R1, E1, B, Z, C>(
  ma: Stream<R, E, A>,
  mb: Stream<R1, E1, B>,
  z: Z,
  f: (
    z: Z,
    s: I.IO<R, Option<E>, A>,
    t: I.IO<R1, Option<E1>, B>
  ) => I.IO<R & R1, never, Ex.Exit<Option<E | E1>, readonly [C, Z]>>
): Stream<R & R1, E | E1, C> {
  return new Stream(
    M.gen(function* (_) {
      const left  = yield* _(M.mapM_(ma.proc, BPull.make))
      const right = yield* _(M.mapM_(mb.proc, BPull.make))
      const pull  = yield* _(
        unfoldM(z, (z) => I.bind_(f(z, BPull.pullElement(left), BPull.pullElement(right)), flow(I.done, I.optional)))
          .proc
      )
      return pull
    })
  )
}

/**
 * Combines the elements from this stream and the specified stream by repeatedly applying the
 * function `f` to extract an element using both sides and conceptually "offer"
 * it to the destination stream. `f` can maintain some internal state to control
 * the combining process, with the initial state being specified by `s`.
 *
 * Where possible, prefer `combineChunks` for a more efficient implementation.
 */
export function combine<R, E, A, R1, E1, B, Z, C>(
  mb: Stream<R1, E1, B>,
  z: Z,
  f: (
    z: Z,
    s: I.IO<R, Option<E>, A>,
    t: I.IO<R1, Option<E1>, B>
  ) => I.IO<R & R1, never, Ex.Exit<Option<E | E1>, readonly [C, Z]>>
): (ma: Stream<R, E, A>) => Stream<R & R1, E | E1, C> {
  return (ma) => combine_(ma, mb, z, f)
}

/**
 * Combines the chunks from this stream and the specified stream by repeatedly applying the
 * function `f` to extract a chunk using both sides and conceptually "offer"
 * it to the destination stream. `f` can maintain some internal state to control
 * the combining process, with the initial state being specified by `s`.
 */
export function combineChunks_<R, E, A, R1, E1, B, Z, C>(
  ma: Stream<R, E, A>,
  mb: Stream<R1, E1, B>,
  z: Z,
  f: (
    z: Z,
    s: I.IO<R, Option<E>, Chunk<A>>,
    t: I.IO<R1, Option<E1>, Chunk<B>>
  ) => I.IO<R & R1, never, Ex.Exit<Option<E | E1>, readonly [Chunk<C>, Z]>>
): Stream<R & R1, E | E1, C> {
  return new Stream(
    M.gen(function* (_) {
      const left  = yield* _(ma.proc)
      const right = yield* _(mb.proc)
      const pull  = yield* _(
        unfoldChunkM(z, (z) =>
          pipe(
            f(z, left, right),
            I.bind((ex) => I.optional(I.done(ex)))
          )
        ).proc
      )
      return pull
    })
  )
}

/**
 * Combines the chunks from this stream and the specified stream by repeatedly applying the
 * function `f` to extract a chunk using both sides and conceptually "offer"
 * it to the destination stream. `f` can maintain some internal state to control
 * the combining process, with the initial state being specified by `s`.
 */
export function combineChunks<R, E, A, R1, E1, B, Z, C>(
  mb: Stream<R1, E1, B>,
  z: Z,
  f: (
    z: Z,
    s: I.IO<R, Option<E>, Chunk<A>>,
    t: I.IO<R1, Option<E1>, Chunk<B>>
  ) => I.IO<R & R1, never, Ex.Exit<Option<E | E1>, readonly [Chunk<C>, Z]>>
): (ma: Stream<R, E, A>) => Stream<R & R1, E | E1, C> {
  return (ma) => combineChunks_(ma, mb, z, f)
}

/**
 * Concatenates the specified stream with this stream, resulting in a stream
 * that emits the elements from this stream and then the elements from the specified stream.
 */
export function concat_<R, E, A, R1, E1, B>(ma: Stream<R, E, A>, mb: Stream<R1, E1, B>): Stream<R & R1, E | E1, A | B> {
  return new Stream(
    M.gen(function* (_) {
      const currStream   = yield* _(Ref.make<I.IO<R & R1, O.Option<E | E1>, Chunk<A | B>>>(Pull.end))
      const switchStream = yield* _(M.switchable<R & R1, never, I.IO<R & R1, O.Option<E | E1>, Chunk<A | B>>>())
      const switched     = yield* _(Ref.make(false))
      yield* _(
        pipe(
          ma.proc,
          switchStream,
          I.bind((x) => currStream.set(x))
        )
      )

      const go: I.IO<R & R1, O.Option<E | E1>, Chunk<A | B>> = pipe(
        currStream.get,
        (x) => I.flatten(x),
        I.catchAllCause(
          flow(
            Ca.sequenceCauseOption,
            O.match(
              () =>
                pipe(
                  switched,
                  Ref.getAndSet(true),
                  I.bind((b) => (b ? Pull.end : pipe(switchStream(mb.proc), I.bind(currStream.set), I.apr(go))))
                ),
              Pull.halt
            )
          )
        )
      )

      return go
    })
  )
}

/**
 * Concatenates the specified stream with this stream, resulting in a stream
 * that emits the elements from this stream and then the elements from the specified stream.
 */
export function concat<R1, E1, B>(
  mb: Stream<R1, E1, B>
): <R, E, A>(ma: Stream<R, E, A>) => Stream<R & R1, E | E1, A | B> {
  return (ma) => concat_(ma, mb)
}

/**
 * Concatenates all of the streams in the chunk to one stream.
 */
export function concatAll<R, E, A>(streams: Chunk<Stream<R, E, A>>): Stream<R, E, A> {
  const chunkSize = streams.length
  return new Stream(
    M.gen(function* (_) {
      const currIndex    = yield* _(Ref.make(0))
      const currStream   = yield* _(Ref.make<I.IO<R, Option<E>, Chunk<A>>>(Pull.end))
      const switchStream = yield* _(M.switchable<R, never, I.IO<R, Option<E>, Chunk<A>>>())

      const go: I.IO<R, Option<E>, Chunk<A>> = pipe(
        currStream.get,
        I.flatten,
        I.catchAllCause(
          flow(
            Ca.sequenceCauseOption,
            O.match(
              () =>
                pipe(
                  currIndex,
                  Ref.getAndUpdate((x) => x + 1),
                  I.bind((i) => {
                    if (i >= chunkSize) {
                      return Pull.end
                    } else {
                      return pipe(switchStream(streams[i].proc), I.bind(currStream.set), I.apr(go))
                    }
                  })
                ),
              Pull.halt
            )
          )
        )
      )
      return go
    })
  )
}

/**
 * Composes this stream with the specified stream to create a cartesian product of elements
 * with a specified function.
 * The `that` stream would be run multiple times, for every element in the `this` stream.
 *
 * See also `zipWith` for the more common point-wise variant.
 */
export function crossWith_<R, E, A, R1, E1, B, C>(
  ma: Stream<R, E, A>,
  mb: Stream<R1, E1, B>,
  f: (o: A, o1: B) => C
): Stream<R & R1, E | E1, C> {
  return bind_(ma, (o) => map_(mb, (o1) => f(o, o1)))
}

/**
 * Composes this stream with the specified stream to create a cartesian product of elements
 * with a specified function.
 * The `that` stream would be run multiple times, for every element in the `this` stream.
 *
 * See also `zipWith` for the more common point-wise variant.
 */
export function crossWith<A, R1, E1, B, C>(
  mb: Stream<R1, E1, B>,
  f: (o: A, o1: B) => C
): <R, E>(ma: Stream<R, E, A>) => Stream<R & R1, E | E1, C> {
  return (ma) => crossWith_(ma, mb, f)
}

/**
 * Composes this stream with the specified stream to create a cartesian product of elements.
 * The `that` stream would be run multiple times, for every element in the `this` stream.
 *
 * See also `zip` and for the more common point-wise variant.
 */
export function cross_<R, E, A, R1, E1, B>(
  ma: Stream<R, E, A>,
  mb: Stream<R1, E1, B>
): Stream<R & R1, E | E1, readonly [A, B]> {
  return crossWith_(ma, mb, tuple)
}

/**
 * Composes this stream with the specified stream to create a cartesian product of elements.
 * The `that` stream would be run multiple times, for every element in the `this` stream.
 *
 * See also `zip` and for the more common point-wise variant.
 */
export function cross<R1, E1, A1>(
  mb: Stream<R1, E1, A1>
): <R, E, A>(ma: Stream<R, E, A>) => Stream<R & R1, E | E1, readonly [A, A1]> {
  return (ma) => cross_(ma, mb)
}

/**
 * Composes this stream with the specified stream to create a cartesian product of elements,
 * but keeps only elements from this stream.
 * The `that` stream would be run multiple times, for every element in the `this` stream.
 *
 * See also `apl` for the more common point-wise variant.
 */
export function crossLeft_<R, E, A, R1, E1, A1>(
  ma: Stream<R, E, A>,
  mb: Stream<R1, E1, A1>
): Stream<R & R1, E | E1, A> {
  return crossWith_(ma, mb, (o, _) => o)
}

/**
 * Composes this stream with the specified stream to create a cartesian product of elements,
 * but keeps only elements from this stream.
 * The `that` stream would be run multiple times, for every element in the `this` stream.
 *
 * See also `apl` for the more common point-wise variant.
 */
export function crossLeft<R1, E1, A1>(
  mb: Stream<R1, E1, A1>
): <R, E, A>(ma: Stream<R, E, A>) => Stream<R & R1, E | E1, A> {
  return (ma) => crossLeft_(ma, mb)
}

/**
 * Composes this stream with the specified stream to create a cartesian product of elements,
 * but keeps only elements from the other stream.
 * The `that` stream would be run multiple times, for every element in the `this` stream.
 *
 * See also `apr` for the more common point-wise variant.
 */
export function crossRight_<R, E, A, R1, E1, A1>(
  ma: Stream<R, E, A>,
  mb: Stream<R1, E1, A1>
): Stream<R & R1, E | E1, A1> {
  return crossWith_(ma, mb, (_, o1) => o1)
}

/**
 * Composes this stream with the specified stream to create a cartesian product of elements,
 * but keeps only elements from the other stream.
 * The `that` stream would be run multiple times, for every element in the `this` stream.
 *
 * See also `apr` for the more common point-wise variant.
 */
export function crossRight<R1, E1, A1>(
  mb: Stream<R1, E1, A1>
): <R, E, A>(ma: Stream<R, E, A>) => Stream<R & R1, E | E1, A1> {
  return (ma) => crossRight_(ma, mb)
}

/**
 * Converts this stream to a stream that executes its effects but emits no
 * elements. Useful for sequencing effects using streams:
 */
export function drain<R, E, A>(ma: Stream<R, E, A>): Stream<R, E, void> {
  return mapChunks_(ma, () => C.empty())
}

/**
 * drains the provided stream in the background for as long as this stream is running.
 * if `ma` ends before `mb`, `mb` will be interrupted. if `mb` fails,
 * `ma` will fail with that error.
 */
export function drainFork_<R, E, A, R1, E1, A1>(
  ma: Stream<R, E, A>,
  mb: Stream<R1, E1, A1>
): Stream<R & R1, E | E1, A> {
  return pipe(
    P.make<E | E1, never>(),
    fromEffect,
    bind((bgDied) =>
      pipe(
        mb,
        foreachManaged(() => I.unit()),
        M.catchAllCause(flow(bgDied.halt, I.toManaged())),
        M.fork,
        managed,
        crossRight(interruptOn_(ma, bgDied))
      )
    )
  )
}

/**
 * drains the provided stream in the background for as long as this stream is running.
 * if `ma` ends before `mb`, `mb` will be interrupted. if `mb` fails,
 * `ma` will fail with that error.
 */
export function drainFork<R1, E1, A1>(
  mb: Stream<R1, E1, A1>
): <R, E, A>(ma: Stream<R, E, A>) => Stream<R & R1, E | E1, A> {
  return (ma) => drainFork_(ma, mb)
}

/**
 * Drops the specified number of elements from this stream.
 */
export function drop_<R, E, A>(self: Stream<R, E, A>, n: number): Stream<R, E, A> {
  return new Stream(
    M.gen(function* (_) {
      const chunks     = yield* _(self.proc)
      const counterRef = yield* _(Ref.make(0))

      const pull: I.IO<R, O.Option<E>, Chunk<A>> = I.gen(function* (_) {
        const chunk = yield* _(chunks)
        const count = yield* _(counterRef.get)
        if (count >= n) {
          return yield* _(I.succeed(chunk))
        } else if (chunk.length <= n - count) {
          return yield* _(pipe(counterRef.set(count + chunk.length), I.apr(pull)))
        } else {
          return yield* _(
            pipe(
              counterRef.set(count + (n - count)),
              I.as(() => C.drop_(chunk, n - count))
            )
          )
        }
      })
      return pull
    })
  )
}

/**
 * Drops the specified number of elements from this stream.
 */
export function drop(n: number) {
  return <R, E, A>(self: Stream<R, E, A>) => drop_(self, n)
}

/**
 * Drops all elements of the stream until the specified predicate evaluates
 * to `true`.
 */
export function dropUntil_<R, E, A>(ma: Stream<R, E, A>, p: Predicate<A>): Stream<R, E, A> {
  return drop_(dropWhile_(ma, not(p)), 1)
}

/**
 * Drops all elements of the stream until the specified predicate evaluates
 * to `true`.
 */
export function dropUntil<A>(p: Predicate<A>): <R, E>(ma: Stream<R, E, A>) => Stream<R, E, A> {
  return (ma) => dropUntil_(ma, p)
}

/**
 * Drops all elements of the stream for as long as the specified predicate
 * evaluates to `true`.
 */
export function dropWhile_<R, E, A>(ma: Stream<R, E, A>, pred: Predicate<A>): Stream<R, E, A> {
  return new Stream(
    M.gen(function* (_) {
      const chunks          = yield* _(ma.proc)
      const keepDroppingRef = yield* _(Ref.make(true))

      const pull: I.IO<R, O.Option<E>, Chunk<A>> = I.gen(function* (_) {
        const chunk        = yield* _(chunks)
        const keepDropping = yield* _(keepDroppingRef.get)
        if (!keepDropping) {
          return yield* _(I.succeed(chunk))
        } else {
          const remaining = C.dropWhile_(chunk, pred)
          const isEmpty   = remaining.length <= 0
          if (isEmpty) {
            return yield* _(pull)
          } else {
            return yield* _(
              pipe(
                keepDroppingRef.set(false),
                I.as(() => remaining)
              )
            )
          }
        }
      })

      return pull
    })
  )
}

/**
 * Drops all elements of the stream for as long as the specified predicate
 * evaluates to `true`.
 */
export function dropWhile<A>(pred: Predicate<A>) {
  return <R, E>(ma: Stream<R, E, A>) => dropWhile_(ma, pred)
}

/**
 * Executes the provided finalizer after this stream's finalizers run.
 */
export function ensuring_<R, E, A, R1>(ma: Stream<R, E, A>, finalizer: I.IO<R1, never, any>): Stream<R & R1, E, A> {
  return new Stream(M.ensuring_(ma.proc, finalizer))
}

/**
 * Executes the provided finalizer after this stream's finalizers run.
 */
export function ensuring<R1>(finalizer: I.IO<R1, never, any>): <R, E, A>(ma: Stream<R, E, A>) => Stream<R & R1, E, A> {
  return (ma) => ensuring_(ma, finalizer)
}

/**
 * Executes the provided finalizer before this stream's finalizers run.
 */
export function ensuringFirst_<R, E, A, R1>(
  stream: Stream<R, E, A>,
  fin: I.IO<R1, never, unknown>
): Stream<R & R1, E, A> {
  return new Stream<R & R1, E, A>(M.ensuringFirst_(stream.proc, fin))
}

/**
 * Executes the provided finalizer before this stream's finalizers run.
 */
export function ensuringFirst<R1>(
  fin: I.IO<R1, never, unknown>
): <R, E, A>(stream: Stream<R, E, A>) => Stream<R & R1, E, A> {
  return (stream) => ensuringFirst_(stream, fin)
}

/**
 * Emits elements of this stream with a fixed delay in between, regardless of how long it
 * takes to produce a value.
 */
export function fixed_<R, E, A>(ma: Stream<R, E, A>, duration: number): Stream<R & Has<Clock>, E, A> {
  return schedule_(ma, Sc.fixed(duration))
}

/**
 * Emits elements of this stream with a fixed delay in between, regardless of how long it
 * takes to produce a value.
 */
export function fixed(duration: number) {
  return <R, E, A>(self: Stream<R, E, A>) => fixed_(self, duration)
}

/**
 * Repeats this stream forever.
 */
export function forever<R, E, A>(ma: Stream<R, E, A>): Stream<R, E, A> {
  return new Stream(
    M.gen(function* (_) {
      const currStream   = yield* _(Ref.make<I.IO<R, O.Option<E>, Chunk<A>>>(Pull.end))
      const switchStream = yield* _(M.switchable<R, never, I.IO<R, O.Option<E>, Chunk<A>>>())
      yield* _(pipe(ma.proc, switchStream, I.bind(currStream.set)))
      const go: I.IO<R, O.Option<E>, Chunk<A>> = pipe(
        currStream.get,
        I.flatten,
        I.catchAllCause(
          flow(
            Ca.sequenceCauseOption,
            O.match(() => pipe(ma.proc, switchStream, I.bind(currStream.set), I.apr(I.yieldNow), I.apr(go)), Pull.halt)
          )
        )
      )
      return go
    })
  )
}

/**
 * More powerful version of `groupByKey`
 */
export function groupBy_<R, E, A, R1, E1, K, V>(
  stream: Stream<R, E, A>,
  f: (a: A) => I.IO<R1, E1, readonly [K, V]>,
  buffer = 16
): GroupBy<R & R1, E | E1, K, V> {
  const qstream = unwrapManaged(
    M.gen(function* (_) {
      const decider = yield* _(P.make<never, (k: K, v: V) => I.UIO<(key: symbol) => boolean>>())

      const out = yield* _(
        pipe(
          Queue.makeBounded<Ex.Exit<O.Option<E | E1>, readonly [K, Queue.Dequeue<Ex.Exit<O.Option<E | E1>, V>>]>>(
            buffer
          ),
          I.toManaged((q) => q.shutdown)
        )
      )
      const ref = yield* _(Ref.make<ReadonlyMap<K, symbol>>(Map.empty()))
      const add = yield* _(
        pipe(
          stream,
          mapM(f),
          distributedWithDynamic(
            buffer,
            ([k, v]) =>
              pipe(
                decider.await,
                I.bind((f) => f(k, v))
              ),
            out.offer
          )
        )
      )
      yield* _(
        decider.succeed((k: K, __: V) =>
          pipe(
            ref.get,
            I.map(Map.lookup(k)),
            I.bind(
              O.match(
                () =>
                  I.bind_(add, ([idx, q]) =>
                    pipe(
                      ref,
                      Ref.update(Map.insert(k, idx)),
                      I.apr(
                        pipe(
                          out.offer(
                            Ex.succeed([
                              k,
                              Queue.map_(
                                q,
                                Ex.map(([, v]) => v)
                              )
                            ])
                          ),
                          I.as(() => (_) => _ === idx)
                        )
                      )
                    )
                  ),
                (idx) => I.succeed((_) => _ === idx)
              )
            )
          )
        )
      )
      return flattenExitOption(fromQueueWithShutdown(out))
    })
  )
  return new GroupBy(qstream, buffer)
}

/**
 * More powerful version of `groupByKey`
 */
export function groupBy<A, R1, E1, K, V>(
  f: (a: A) => I.IO<R1, E1, readonly [K, V]>,
  buffer = 16
): <R, E>(stream: Stream<R, E, A>) => GroupBy<R & R1, E | E1, K, V> {
  return (stream) => groupBy_(stream, f, buffer)
}

/**
 * Partition a stream using a function and process each stream individually.
 * This returns a data structure that can be used
 * to further filter down which groups shall be processed.
 *
 * After calling merge on the GroupBy object, the remaining groups will be processed
 * in parallel and the resulting streams merged in a nondeterministic fashion.
 *
 * Up to `buffer` elements may be buffered in any group stream before the producer
 * is backpressured. Take care to consume from all streams in order
 * to prevent deadlocks.
 */
export function groupByKey_<R, E, A, K>(ma: Stream<R, E, A>, f: (a: A) => K, buffer = 16): GroupBy<R, E, K, A> {
  return pipe(
    ma,
    groupBy((a) => I.succeed(tuple(f(a), a)), buffer)
  )
}

/**
 * Partition a stream using a function and process each stream individually.
 * This returns a data structure that can be used
 * to further filter down which groups shall be processed.
 *
 * After calling merge on the GroupBy object, the remaining groups will be processed
 * in parallel and the resulting streams merged in a nondeterministic fashion.
 *
 * Up to `buffer` elements may be buffered in any group stream before the producer
 * is backpressured. Take care to consume from all streams in order
 * to prevent deadlocks.
 */
export function groupByKey<A, K>(f: (a: A) => K, buffer = 16): <R, E>(ma: Stream<R, E, A>) => GroupBy<R, E, K, A> {
  return (stream) => groupByKey_(stream, f, buffer)
}

/**
 * Partitions the stream with specified chunkSize
 */
export function grouped_<R, E, A>(ma: Stream<R, E, A>, chunkSize: number): Stream<R, E, Chunk<A>> {
  return aggregate_(ma, Tr.collectAllN(chunkSize))
}

/**
 * Partitions the stream with specified chunkSize
 */
export function grouped(chunkSize: number): <R, E, A>(ma: Stream<R, E, A>) => Stream<R, E, Chunk<A>> {
  return (ma) => grouped_(ma, chunkSize)
}

/**
 * Halts the evaluation of this stream when the provided IO completes. The given IO
 * will be forked as part of the returned stream, and its success will be discarded.
 *
 * An element in the process of being pulled will not be interrupted when the IO
 * completes. See `interruptWhen` for this behavior.
 *
 * If the IO completes with a failure, the stream will emit that failure.
 */
export function haltWhen_<R, E, A, R1, E1>(ma: Stream<R, E, A>, io: I.IO<R1, E1, any>): Stream<R & R1, E | E1, A> {
  return new Stream(
    M.gen(function* (_) {
      const as    = yield* _(ma.proc)
      const runIO = yield* _(I.forkManaged(io))
      return pipe(
        runIO.poll,
        I.bind(
          O.match(
            (): I.IO<R & R1, O.Option<E | E1>, Chunk<A>> => as,
            Ex.match(Pull.halt, () => Pull.end)
          )
        )
      )
    })
  )
}

/**
 * Halts the evaluation of this stream when the provided IO completes. The given IO
 * will be forked as part of the returned stream, and its success will be discarded.
 *
 * An element in the process of being pulled will not be interrupted when the IO
 * completes. See `interruptWhen` for this behavior.
 *
 * If the IO completes with a failure, the stream will emit that failure.
 */
export function haltWhen<R1, E1>(io: I.IO<R1, E1, any>): <R, E, A>(ma: Stream<R, E, A>) => Stream<R & R1, E | E1, A> {
  return (ma) => haltWhen_(ma, io)
}

/**
 * Specialized version of haltWhen which halts the evaluation of this stream
 * after the given duration.
 *
 * An element in the process of being pulled will not be interrupted when the
 * given duration completes. See `interruptAfter` for this behavior.
 */
export function haltAfter_<R, E, A>(ma: Stream<R, E, A>, duration: number): Stream<R & Has<Clock>, E, A> {
  return haltWhen_(ma, I.sleep(duration))
}

/**
 * Specialized version of haltWhen which halts the evaluation of this stream
 * after the given duration.
 *
 * An element in the process of being pulled will not be interrupted when the
 * given duration completes. See `interruptAfter` for this behavior.
 */
export function haltAfter(duration: number): <R, E, A>(ma: Stream<R, E, A>) => Stream<R & Has<Clock>, E, A> {
  return (ma) => haltAfter_(ma, duration)
}

/**
 * Halts the evaluation of this stream when the provided promise resolves.
 *
 * If the promise completes with a failure, the stream will emit that failure.
 */
export function haltOn_<R, E, A, E1>(ma: Stream<R, E, A>, p: P.Promise<E1, any>): Stream<R, E | E1, A> {
  return new Stream(
    M.gen(function* (_) {
      const as      = yield* _(ma.proc)
      const doneRef = yield* _(Ref.make(false))
      const pull    = pipe(
        doneRef.get,
        I.bind((done) => {
          if (done) {
            return Pull.end
          } else {
            return pipe(
              p.poll,
              I.bind(
                O.match(
                  (): I.IO<R, O.Option<E | E1>, Chunk<A>> => as,
                  (v) => pipe(doneRef.set(true), I.apr(I.mapError_(v, O.Some)), I.apr(Pull.end))
                )
              )
            )
          }
        })
      )
      return pull
    })
  )
}

/**
 * Halts the evaluation of this stream when the provided promise resolves.
 *
 * If the promise completes with a failure, the stream will emit that failure.
 */
export function haltOn<E1>(p: P.Promise<E1, any>): <R, E, A>(ma: Stream<R, E, A>) => Stream<R, E | E1, A> {
  return (ma) => haltOn_(ma, p)
}

/**
 * Combines this stream and the specified stream deterministically using the
 * stream of boolean values `b` to control which stream to pull from next.
 * `true` indicates to pull from this stream and `false` indicates to pull
 * from the specified stream. Only consumes as many elements as requested by
 * `b`. If either this stream or the specified stream are exhausted further
 * requests for values from that stream will be ignored.
 */
export function interleaveWith_<R, E, A, R1, E1, A1>(
  ma: Stream<R, E, A>,
  mb: Stream<R1, E1, A1>,
  b: Stream<R & R1, E | E1, boolean>
): Stream<R & R1, E | E1, A | A1> {
  const loop = (
    leftDone: boolean,
    rightDone: boolean,
    s: I.IO<R & R1, O.Option<E | E1>, boolean>,
    left: I.IO<R, O.Option<E>, A>,
    right: I.IO<R1, O.Option<E1>, A1>
  ): I.IO<
    R & R1,
    never,
    Ex.Exit<O.Option<E | E1>, readonly [A | A1, readonly [boolean, boolean, I.IO<R & R1, O.Option<E | E1>, boolean>]]>
  > => {
    return pipe(
      s,
      I.matchCauseM(
        flow(
          Ca.sequenceCauseOption,
          O.match(
            () => I.succeed(Ex.fail(O.None())),
            (e) => I.succeed(Ex.halt(Ca.map_(e, O.Some)))
          )
        ),
        (b) => {
          if (b && !leftDone) {
            return pipe(
              left,
              I.matchCauseM(
                flow(
                  Ca.sequenceCauseOption,
                  O.match(
                    () => {
                      if (rightDone) {
                        return I.succeed(Ex.fail(O.None()))
                      } else {
                        return loop(true, rightDone, s, left, right)
                      }
                    },
                    (e) => I.succeed(Ex.halt(Ca.map_(e, O.Some)))
                  )
                ),
                (a) => I.succeed(Ex.succeed([a, [leftDone, rightDone, s]] as const))
              )
            )
          } else if (!b && !rightDone) {
            return pipe(
              right,
              I.matchCauseM(
                flow(
                  Ca.sequenceCauseOption,
                  O.match(
                    () => {
                      if (rightDone) {
                        return I.succeed(Ex.fail(O.None()))
                      } else {
                        return loop(leftDone, true, s, left, right)
                      }
                    },
                    (e) => I.succeed(Ex.halt(Ca.map_(e, O.Some)))
                  )
                ),
                (a) => I.succeed(Ex.succeed([a, [leftDone, rightDone, s]] as const))
              )
            )
          } else {
            return loop(leftDone, rightDone, s, left, right)
          }
        }
      )
    )
  }

  return new Stream(
    M.gen(function* (_) {
      const sides  = yield* _(pipe(b.proc, M.mapM(BPull.make)))
      const result = yield* _(
        pipe(
          ma,
          combine(
            mb,
            [false, false, BPull.pullElement(sides)] as readonly [
              boolean,
              boolean,
              I.IO<R & R1, O.Option<E | E1>, boolean>
            ],
            ([leftDone, rightDone, sides], left, right) => loop(leftDone, rightDone, sides, left, right)
          )
        ).proc
      )
      return result
    })
  )
}

/**
 * Combines this stream and the specified stream deterministically using the
 * stream of boolean values `b` to control which stream to pull from next.
 * `true` indicates to pull from this stream and `false` indicates to pull
 * from the specified stream. Only consumes as many elements as requested by
 * `b`. If either this stream or the specified stream are exhausted further
 * requests for values from that stream will be ignored.
 */
export function interleaveWith<R, E, R1, E1, A1>(
  mb: Stream<R1, E1, A1>,
  b: Stream<R & R1, E | E1, boolean>
): <A>(ma: Stream<R, E, A>) => Stream<R & R1, E | E1, A | A1> {
  return (ma) => interleaveWith_(ma, mb, b)
}

/**
 * Interleaves this stream and the specified stream deterministically by
 * alternating pulling values from this stream and the specified stream.
 * When one stream is exhausted all remaining values in the other stream
 * will be pulled.
 */
export function interleave_<R, E, A, R1, E1, A1>(
  ma: Stream<R, E, A>,
  mb: Stream<R1, E1, A1>
): Stream<R & R1, E | E1, A | A1> {
  return interleaveWith_(ma, mb, forever(fromChunk([true, false])))
}

/**
 * Interleaves this stream and the specified stream deterministically by
 * alternating pulling values from this stream and the specified stream.
 * When one stream is exhausted all remaining values in the other stream
 * will be pulled.
 */
export function interleave<R1, E1, A1>(
  mb: Stream<R1, E1, A1>
): <R, E, A>(ma: Stream<R, E, A>) => Stream<R & R1, E | E1, A | A1> {
  return (ma) => interleave_(ma, mb)
}

/**
 * Intersperse stream with provided element similar to <code>List.mkString</code>.
 */
export function intersperse_<R, E, A, A1>(ma: Stream<R, E, A>, middle: A1): Stream<R, E, A | A1> {
  return new Stream(
    M.gen(function* (_) {
      const state  = yield* _(Ref.make(true))
      const chunks = yield* _(ma.proc)
      const pull   = pipe(
        chunks,
        I.bind((os) =>
          Ref.modify_(state, (first) => {
            const r      = []
            let mut_flag = first
            for (const o of os) {
              if (mut_flag) {
                mut_flag = false
                r.push(o)
              } else {
                r.push(middle)
                r.push(o)
              }
            }
            return [r, mut_flag]
          })
        )
      )
      return pull
    })
  )
}

/**
 * Intersperse stream with provided element similar to <code>List.mkString</code>.
 */
export function intersperse<A1>(middle: A1): <R, E, A>(ma: Stream<R, E, A>) => Stream<R, E, A | A1> {
  return (ma) => intersperse_(ma, middle)
}

/**
 * Interrupts the evaluation of this stream when the provided IO completes. The given
 * IO will be forked as part of this stream, and its success will be discarded. This
 * combinator will also interrupt any in-progress element being pulled from upstream.
 *
 * If the IO completes with a failure before the stream completes, the returned stream
 * will emit that failure.
 */
export function interruptWhen_<R, E, A, R1, E1>(ma: Stream<R, E, A>, io: I.IO<R1, E1, any>): Stream<R & R1, E | E1, A> {
  return new Stream(
    M.gen(function* (_) {
      const as    = yield* _(ma.proc)
      const runIO = yield* _(
        pipe(io, I.asSomeError, I.apr(Pull.end as I.IO<unknown, O.Option<E | E1>, any>), I.forkManaged)
      )
      return pipe(runIO, Fi.join, I.disconnect, I.raceFirst(as))
    })
  )
}

/**
 * Interrupts the evaluation of this stream when the provided IO completes. The given
 * IO will be forked as part of this stream, and its success will be discarded. This
 * combinator will also interrupt any in-progress element being pulled from upstream.
 *
 * If the IO completes with a failure before the stream completes, the returned stream
 * will emit that failure.
 */
export function interruptWhen<R1, E1>(
  io: I.IO<R1, E1, any>
): <R, E, A>(ma: Stream<R, E, A>) => Stream<R & R1, E | E1, A> {
  return (ma) => interruptWhen_(ma, io)
}

/**
 * Interrupts the evaluation of this stream when the provided promise resolves. This
 * combinator will also interrupt any in-progress element being pulled from upstream.
 *
 * If the promise completes with a failure, the stream will emit that failure.
 */
export function interruptOn_<R, E, A, E1, A1>(ma: Stream<R, E, A>, p: P.Promise<E1, A1>): Stream<R, E | E1, A> {
  return new Stream(
    M.gen(function* (_) {
      const as      = yield* _(ma.proc)
      const doneRef = yield* _(Ref.make(false))
      const asPull  = pipe(
        p.await,
        I.asSomeError,
        I.apr(doneRef.set(true)),
        I.apr(Pull.end as I.IO<unknown, O.Option<E | E1>, any>)
      )
      const pull    = pipe(
        doneRef.get,
        I.cross(p.isDone),
        I.bind(([b1, b2]) => {
          if (b1) {
            return Pull.end
          }
          if (b2) {
            return asPull
          }
          return I.raceFirst(as)(asPull)
        })
      )
      return pull
    })
  )
}

/**
 * Interrupts the evaluation of this stream when the provided promise resolves. This
 * combinator will also interrupt any in-progress element being pulled from upstream.
 *
 * If the promise completes with a failure, the stream will emit that failure.
 */
export function interruptOn<E1>(p: P.Promise<E1, any>): <R, E, A>(ma: Stream<R, E, A>) => Stream<R, E | E1, A> {
  return (ma) => interruptOn_(ma, p)
}

/**
 * enqueues elements of this stream into a queue. stream failure and ending will also be
 * signalled.
 */
export function into_<R, E, A, R1, E1>(
  ma: Stream<R, E, A>,
  queue: Queue.XQueue<R1, never, never, unknown, Take.Take<E | E1, A>, any>
): I.IO<R & R1, E | E1, void> {
  return M.use_(intoManaged_(ma, queue), () => I.unit())
}

/**
 * Enqueues elements of this stream into a queue. Stream failure and ending will also be
 * signalled.
 */
export function into<E, A, R1, E1>(
  queue: Queue.XQueue<R1, never, never, unknown, Take.Take<E | E1, A>, any>
): <R>(ma: Stream<R, E, A>) => I.IO<R & R1, E | E1, void> {
  return (ma) => into_(ma, queue)
}

/**
 * Like `into`, but provides the result as a `Managed` to allow for scope
 * composition.
 */
export function intoManaged_<R, E, A, R1, E1>(
  ma: Stream<R, E, A>,
  queue: Queue.XQueue<R1, never, never, unknown, Take.Take<E | E1, A>, any>
): M.Managed<R & R1, E | E1, void> {
  return M.gen(function* (_) {
    const os = yield* _(ma.proc)

    const pull: I.IO<R & R1, never, void> = pipe(
      os,
      I.matchCauseM(
        flow(
          Ca.sequenceCauseOption,
          O.match(
            () => pipe(Take.end, queue.offer, I.asUnit),
            (cause) => pipe(cause, Take.halt, queue.offer, I.apr(pull))
          )
        ),
        (c) => pipe(c, Take.chunk, queue.offer, I.apr(pull))
      )
    )
    return yield* _(pull)
  })
}

/**
 * Like `into`, but provides the result as a `Managed` to allow for scope
 * composition.
 */
export function intoManaged<E, A, R1, E1>(
  queue: Queue.XQueue<R1, never, never, unknown, Take.Take<E | E1, A>, any>
): <R>(ma: Stream<R, E, A>) => M.Managed<R & R1, E | E1, void> {
  return (ma) => intoManaged_(ma, queue)
}

/**
 * Statefully and effectfully maps over the elements of this stream to produce
 * new elements.
 */
export function mapAccumM_<R, E, A, R1, E1, B, Z>(
  stream: Stream<R, E, A>,
  z: Z,
  f: (z: Z, a: A) => I.IO<R1, E1, readonly [Z, B]>
): Stream<R & R1, E | E1, B> {
  return new Stream<R & R1, E | E1, B>(
    M.gen(function* (_) {
      const state = yield* _(Ref.make(z))
      const pull  = yield* _(pipe(stream.proc, M.mapM(BPull.make)))
      return pipe(
        pull,
        BPull.pullElement,
        I.bind((o) =>
          pipe(
            I.gen(function* (_) {
              const s = yield* _(state.get)
              const t = yield* _(f(s, o))
              yield* _(state.set(t[0]))
              return C.pure(t[1])
            }),
            I.mapError(O.Some)
          )
        )
      )
    })
  )
}

/**
 * Statefully and effectfully maps over the elements of this stream to produce
 * new elements.
 */
export function mapAccumM<Z>(
  z: Z
): <A, R1, E1, B>(
  f: (z: Z, a: A) => I.IO<R1, E1, [Z, B]>
) => <R, E>(stream: Stream<R, E, A>) => Stream<R & R1, E1 | E, B> {
  return (f) => (stream) => mapAccumM_(stream, z, f)
}

/**
 * Statefully maps over the elements of this stream to produce new elements.
 */
export function mapAccum_<R, E, A, B, Z>(stream: Stream<R, E, A>, z: Z, f: (z: Z, a: A) => readonly [Z, B]) {
  return mapAccumM_(stream, z, (z, a) => I.pure(f(z, a)))
}

/**
 * Statefully maps over the elements of this stream to produce new elements.
 */
export function mapAccum<Z>(
  z: Z
): <A, B>(f: (z: Z, a: A) => [Z, B]) => <R, E>(stream: Stream<R, E, A>) => Stream<R, E, B> {
  return (f) => (stream) => mapAccum_(stream, z, f)
}

/**
 * Maps each element to an iterable, and flattens the iterables into the
 * output of this stream.
 */
export function mapConcat_<R, E, A, B>(ma: Stream<R, E, A>, f: (a: A) => Iterable<B>) {
  return mapChunks_(ma, (chunks) => C.bind_(chunks, (a) => Array.from(f(a))))
}

/**
 * Maps each element to an iterable, and flattens the iterables into the
 * output of this stream.
 */
export function mapConcat<A, B>(f: (a: A) => Iterable<B>): <R, E>(ma: Stream<R, E, A>) => Stream<R, E, B> {
  return (ma) => mapConcat_(ma, f)
}

/**
 * Maps each element to a chunk, and flattens the chunks into the output of
 * this stream.
 */
export function mapConcatChunk_<R, E, A, B>(ma: Stream<R, E, A>, f: (a: A) => Chunk<B>): Stream<R, E, B> {
  return mapChunks_(ma, (chunks) => C.bind_(chunks, f))
}

/**
 * Maps each element to a chunk, and flattens the chunks into the output of
 * this stream.
 */
export function mapConcatChunk<A, B>(f: (a: A) => Chunk<B>): <R, E>(ma: Stream<R, E, A>) => Stream<R, E, B> {
  return (ma) => mapConcatChunk_(ma, f)
}

/**
 * Effectfully maps each element to a chunk, and flattens the chunks into
 * the output of this stream.
 */
export function mapConcatChunkM_<R, E, A, R1, E1, B>(
  ma: Stream<R, E, A>,
  f: (a: A) => I.IO<R1, E1, Chunk<B>>
): Stream<R & R1, E | E1, B> {
  return pipe(ma, mapM(f), mapConcatChunk(identity))
}

/**
 * Effectfully maps each element to a chunk, and flattens the chunks into
 * the output of this stream.
 */
export function mapConcatChunkM<A, R1, E1, B>(
  f: (a: A) => I.IO<R1, E1, Chunk<B>>
): <R, E>(ma: Stream<R, E, A>) => Stream<R & R1, E1 | E, B> {
  return (ma) => mapConcatChunkM_(ma, f)
}

/**
 * Effectfully maps each element to an iterable, and flattens the iterables into
 * the output of this stream.
 */
export function mapConcatM_<R, E, A, R1, E1, B>(
  ma: Stream<R, E, A>,
  f: (a: A) => I.IO<R1, E1, Iterable<B>>
): Stream<R & R1, E | E1, B> {
  return pipe(
    ma,
    mapConcatChunkM((a) => I.map_(f(a), (_) => Array.from(_)))
  )
}

/**
 * Effectfully maps each element to an iterable, and flattens the iterables into
 * the output of this stream.
 */
export function mapConcatM<A, R1, E1, B>(
  f: (a: A) => I.IO<R1, E1, Iterable<B>>
): <R, E>(ma: Stream<R, E, A>) => Stream<R & R1, E | E1, B> {
  return (ma) => mapConcatM_(ma, f)
}

/**
 * Maps over elements of the stream with the specified effectful function,
 * executing up to `n` invocations of `f` concurrently. Transformed elements
 * will be emitted in the original order.
 */
export function mapMPar_(n: number) {
  return <R, E, A, R1, E1, B>(stream: Stream<R, E, A>, f: (a: A) => I.IO<R1, E1, B>): Stream<R & R1, E | E1, B> =>
    new Stream(
      M.gen(function* (_) {
        const out         = yield* _(Queue.makeBounded<I.IO<R1, Option<E | E1>, B>>(n))
        const errorSignal = yield* _(P.make<E1, never>())
        const permits     = yield* _(Semaphore.make(n))
        yield* _(
          pipe(
            stream,
            foreachManaged((o) =>
              I.gen(function* (_) {
                const p     = yield* _(P.make<E1, B>())
                const latch = yield* _(P.make<never, void>())
                yield* _(out.offer(pipe(p.await, I.mapError(O.Some))))
                yield* _(
                  pipe(
                    latch,
                    P.succeed<void>(undefined),
                    I.apr(pipe(errorSignal.await, I.raceFirst(f(o)), I.tapCause(errorSignal.halt), I.to(p))),
                    Semaphore.withPermit(permits),
                    I.fork
                  )
                )
                yield* _(latch.await)
              })
            ),
            M.matchCauseM(flow(Pull.halt, out.offer, I.toManaged()), () =>
              pipe(
                Semaphore.withPermits_(I.unit(), n, permits),
                I.bind(() => out.offer(Pull.end)),
                I.toManaged()
              )
            ),
            M.fork
          )
        )
        return pipe(out.take, I.flatten, I.map(C.pure))
      })
    )
}

/**
 * Maps over elements of the stream with the specified effectful function,
 * executing up to `n` invocations of `f` concurrently. Transformed elements
 * will be emitted in the original order.
 */
export function mapMPar(
  n: number
): <A, R1, E1, B>(f: (a: A) => I.IO<R1, E1, B>) => <R, E>(stream: Stream<R, E, A>) => Stream<R & R1, E1 | E, B> {
  return (f) => (stream) => mapMPar_(n)(stream, f)
}

export type TerminationStrategy = 'Left' | 'Right' | 'Both' | 'Either'

/**
 * Merges this stream and the specified stream together to a common element
 * type with the specified mapping functions.
 *
 * New produced stream will terminate when both specified stream terminate if
 * no termination strategy is specified.
 */
export function mergeWith_<R, E, A, R1, E1, B, C, C1>(
  sa: Stream<R, E, A>,
  sb: Stream<R1, E1, B>,
  l: (a: A) => C,
  r: (b: B) => C1,
  strategy: TerminationStrategy = 'Both'
): Stream<R1 & R, E | E1, C | C1> {
  return new Stream(
    M.gen(function* (_) {
      const handoff = yield* _(Ha.make<Take.Take<E | E1, C | C1>>())
      const doneRef = yield* _(RefM.make<O.Option<boolean>>(O.None()))
      const chunksL = yield* _(sa.proc)
      const chunksR = yield* _(sb.proc)

      const handler = (pull: Pull.Pull<R & R1, E | E1, C | C1>, terminate: boolean) =>
        pipe(
          doneRef.get,
          I.bind((o) => {
            if (o._tag === 'Some' && o.value) {
              return I.succeed(false)
            } else {
              return pipe(
                pull,
                I.result,
                I.bind((exit) =>
                  pipe(
                    doneRef,
                    RefM.modify((o) => {
                      const causeOrChunk = pipe(
                        exit,
                        Ex.match(
                          (c): E.Either<O.Option<Ca.Cause<E | E1>>, Chunk<C | C1>> =>
                            E.Left(Ca.sequenceCauseOption(c)),
                          E.Right
                        )
                      )

                      if (o._tag === 'Some' && o.value) {
                        return I.succeed([false, o])
                      } else if (causeOrChunk._tag === 'Right') {
                        return pipe(
                          handoff,
                          Ha.offer(<Take.Take<E | E1, C | C1>>Take.chunk(causeOrChunk.right)),
                          I.as(() => [true, o])
                        )
                      } else if (causeOrChunk._tag === 'Left' && causeOrChunk.left._tag === 'Some') {
                        return pipe(
                          handoff,
                          Ha.offer(<Take.Take<E | E1, C | C1>>Take.halt(causeOrChunk.left.value)),
                          I.as(() => [false, O.Some(true)])
                        )
                      } else if (
                        causeOrChunk._tag === 'Left' &&
                        causeOrChunk.left._tag === 'None' &&
                        (terminate || o._tag === 'Some')
                      ) {
                        return pipe(
                          handoff,
                          Ha.offer(<Take.Take<E | E1, C | C1>>Take.end),
                          I.as(() => [false, O.Some(true)])
                        )
                      } else {
                        return I.succeed([false, O.Some(false)])
                      }
                    })
                  )
                )
              )
            }
          }),
          I.repeatWhile(identity),
          I.fork,
          I.makeInterruptible,
          I.toManaged(Fi.interrupt)
        )

      yield* _(handler(pipe(chunksL, I.map(C.map(l))), strategy === 'Left' || strategy === 'Either'))
      yield* _(handler(pipe(chunksR, I.map(C.map(r))), strategy === 'Right' || strategy === 'Either'))
      return I.gen(function* (_) {
        const done   = yield* _(doneRef.get)
        const take   = yield* _(done._tag === 'Some' && done.value ? I.get(Ha.poll(handoff)) : Ha.take(handoff))
        const result = yield* _(Take.done(take))
        return result
      })
    })
  )
}

/**
 * Merges this stream and the specified stream together to a common element
 * type with the specified mapping functions.
 *
 * New produced stream will terminate when both specified stream terminate if
 * no termination strategy is specified.
 */
export function mergeWith<R, E, A, R1, E1, B, C, C1>(
  that: Stream<R1, E1, B>,
  l: (a: A) => C,
  r: (b: B) => C1,
  strategy: TerminationStrategy = 'Both'
): (ma: Stream<R, E, A>) => Stream<R1 & R, E | E1, C | C1> {
  return (ma) => mergeWith_(ma, that, l, r, strategy)
}

/**
 * Merges this stream and the specified stream together.
 *
 * New produced stream will terminate when both specified stream terminate if no termination
 * strategy is specified.
 */
export function merge_<R, E, A, R1, E1, B>(
  self: Stream<R, E, A>,
  that: Stream<R1, E1, B>,
  strategy: TerminationStrategy = 'Both'
): Stream<R1 & R, E | E1, A | B> {
  return mergeWith_(
    self,
    that,
    (a): A | B => a,
    (b) => b,
    strategy
  )
}

/**
 * Merges this stream and the specified stream together.
 *
 * New produced stream will terminate when both specified stream terminate if no termination
 * strategy is specified.
 */
export function merge<R1, E1, B>(
  sb: Stream<R1, E1, B>,
  strategy: TerminationStrategy = 'Both'
): <R, E, A>(sa: Stream<R, E, A>) => Stream<R1 & R, E1 | E, B | A> {
  return (sa) => merge_(sa, sb, strategy)
}

/**
 * Merges this stream and the specified stream together. New produced stream will
 * terminate when either stream terminates.
 */
export function mergeTerminateEither_<R, E, A, R1, E1, B>(
  sa: Stream<R, E, A>,
  sb: Stream<R1, E1, B>
): Stream<R1 & R, E | E1, A | B> {
  return merge_(sa, sb, 'Either')
}

/**
 * Merges this stream and the specified stream together. New produced stream will
 * terminate when either stream terminates.
 */
export function mergeTerminateEither<R1, E1, B>(
  sb: Stream<R1, E1, B>
): <R, E, A>(sa: Stream<R, E, A>) => Stream<R1 & R, E1 | E, B | A> {
  return (sa) => merge_(sa, sb, 'Either')
}

/**
 * Merges this stream and the specified stream together. New produced stream will
 * terminate when this stream terminates.
 */
export function mergeTerminateLeft_<R, E, A, R1, E1, B>(
  sa: Stream<R, E, A>,
  sb: Stream<R1, E1, B>
): Stream<R1 & R, E | E1, A | B> {
  return merge_(sa, sb, 'Left')
}

/**
 * Merges this stream and the specified stream together. New produced stream will
 * terminate when this stream terminates.
 */
export function mergeTerminateLeft<R1, E1, B>(
  sb: Stream<R1, E1, B>
): <R, E, A>(sa: Stream<R, E, A>) => Stream<R1 & R, E1 | E, B | A> {
  return (sa) => merge_(sa, sb, 'Left')
}

/**
 * Merges this stream and the specified stream together. New produced stream will
 * terminate when the specified stream terminates.
 */
export function mergeTerminateRight_<R, E, A, R1, E1, B>(
  sa: Stream<R, E, A>,
  sb: Stream<R1, E1, B>
): Stream<R1 & R, E | E1, A | B> {
  return merge_(sa, sb, 'Right')
}

/**
 * Merges this stream and the specified stream together. New produced stream will
 * terminate when the specified stream terminates.
 */
export function mergeTerminateRight<R1, E1, B>(
  sb: Stream<R1, E1, B>
): <R, E, A>(sa: Stream<R, E, A>) => Stream<R1 & R, E1 | E, B | A> {
  return (sa) => merge_(sa, sb, 'Right')
}

/**
 * Merges this stream and the specified stream together to produce a stream of
 * eithers.
 */
export function mergeEither_<R, E, A, R1, E1, B>(
  sa: Stream<R, E, A>,
  sb: Stream<R1, E1, B>,
  strategy: TerminationStrategy = 'Both'
): Stream<R & R1, E | E1, E.Either<A, B>> {
  return mergeWith_(sa, sb, E.Left, E.Right, strategy)
}

/**
 * Merges this stream and the specified stream together to produce a stream of
 * eithers.
 */
export function mergeEither<R1, E1, B>(
  sb: Stream<R1, E1, B>,
  strategy: TerminationStrategy = 'Both'
): <R, E, A>(sa: Stream<R, E, A>) => Stream<R & R1, E1 | E, E.Either<A, B>> {
  return (sa) => mergeEither_(sa, sb, strategy)
}

/**
 * Executes a pure fold over the stream of values - reduces all elements in the stream to a value of type `S`.
 */
export function fold_<R, E, A, S>(ma: Stream<R, E, A>, s: S, f: (s: S, o: A) => S): I.IO<R, E, S> {
  return M.use_(
    foldWhileManagedM_(ma, s, constTrue, (s, o) => I.succeed(f(s, o))),
    I.succeed
  )
}

/**
 * Executes a pure fold over the stream of values - reduces all elements in the stream to a value of type `S`.
 */
export function fold<A, S>(s: S, f: (s: S, a: A) => S): <R, E>(ma: Stream<R, E, A>) => I.IO<R, E, S> {
  return (ma) => fold_(ma, s, f)
}

/**
 * Executes an effectful fold over the stream of values.
 */
export function foldM_<R, E, A, R1, E1, S>(
  ma: Stream<R, E, A>,
  s: S,
  f: (s: S, a: A) => I.IO<R1, E1, S>
): I.IO<R & R1, E | E1, S> {
  return M.use_(foldWhileManagedM_(ma, s, constTrue, f), I.succeed)
}

/**
 * Executes an effectful fold over the stream of values.
 */
export function foldM<A, R1, E1, S>(
  s: S,
  f: (s: S, a: A) => I.IO<R1, E1, S>
): <R, E>(ma: Stream<R, E, A>) => I.IO<R & R1, E | E1, S> {
  return (ma) => foldM_(ma, s, f)
}

/**
 * Executes a pure fold over the stream of values.
 * Returns a Managed value that represents the scope of the stream.
 */
export function foldManaged_<R, E, A, S>(ma: Stream<R, E, A>, s: S, f: (s: S, a: A) => S): M.Managed<R, E, S> {
  return foldWhileManagedM_(ma, s, constTrue, (s, o) => I.succeed(f(s, o)))
}

/**
 * Executes a pure fold over the stream of values.
 * Returns a Managed value that represents the scope of the stream.
 */
export function foldManaged<A, S>(s: S, f: (s: S, a: A) => S): <R, E>(ma: Stream<R, E, A>) => M.Managed<R, E, S> {
  return (ma) => foldManaged_(ma, s, f)
}

/**
 * Executes an effectful fold over the stream of values.
 * Returns a Managed value that represents the scope of the stream.
 */
export function foldManagedM_<R, E, A, R1, E1, S>(
  ma: Stream<R, E, A>,
  s: S,
  f: (s: S, a: A) => I.IO<R1, E1, S>
): M.Managed<R & R1, E | E1, S> {
  return foldWhileManagedM_(ma, s, constTrue, f)
}

/**
 * Executes an effectful fold over the stream of values.
 * Returns a Managed value that represents the scope of the stream.
 */
export function foldManagedM<A, R1, E1, S>(
  s: S,
  f: (s: S, a: A) => I.IO<R1, E1, S>
): <R, E>(ma: Stream<R, E, A>) => M.Managed<R & R1, E | E1, S> {
  return (ma) => foldManagedM_(ma, s, f)
}

/**
 * Reduces the elements in the stream to a value of type `S`.
 * Stops the fold early when the condition is not fulfilled.
 */
export function foldWhile_<R, E, A, S>(
  ma: Stream<R, E, A>,
  s: S,
  cont: (s: S) => boolean,
  f: (s: S, a: A) => S
): I.IO<R, E, S> {
  return M.use_(
    foldWhileManagedM_(ma, s, cont, (s, o) => I.succeed(f(s, o))),
    I.succeed
  )
}

/**
 * Reduces the elements in the stream to a value of type `S`.
 * Stops the fold early when the condition is not fulfilled.
 */
export function foldWhile<A, S>(
  s: S,
  cont: (s: S) => boolean,
  f: (s: S, a: A) => S
): <R, E>(ma: Stream<R, E, A>) => I.IO<R, E, S> {
  return (ma) => foldWhile_(ma, s, cont, f)
}

/**
 * Executes an effectful fold over the stream of values.
 * Stops the fold early when the condition is not fulfilled.
 */
export function foldWhileM_<R, E, A, R1, E1, S>(
  ma: Stream<R, E, A>,
  s: S,
  cont: (s: S) => boolean,
  f: (s: S, a: A) => I.IO<R1, E1, S>
): I.IO<R & R1, E | E1, S> {
  return M.use_(foldWhileManagedM_(ma, s, cont, f), I.succeed)
}

/**
 * Executes an effectful fold over the stream of values.
 * Stops the fold early when the condition is not fulfilled.
 */
export function foldWhileM<A, R1, E1, S>(
  s: S,
  cont: (s: S) => boolean,
  f: (s: S, a: A) => I.IO<R1, E1, S>
): <R, E>(ma: Stream<R, E, A>) => I.IO<R & R1, E | E1, S> {
  return (ma) => foldWhileM_(ma, s, cont, f)
}

/**
 * Executes a pure fold over the stream of values.
 * Returns a Managed value that represents the scope of the stream.
 * Stops the fold early when the condition is not fulfilled.
 */
export function foldWhileManaged_<R, E, A, S>(
  ma: Stream<R, E, A>,
  s: S,
  cont: (s: S) => boolean,
  f: (s: S, a: A) => S
): M.Managed<R, E, S> {
  return foldWhileManagedM_(ma, s, cont, (s, o) => I.succeed(f(s, o)))
}

/**
 * Executes a pure fold over the stream of values.
 * Returns a Managed value that represents the scope of the stream.
 * Stops the fold early when the condition is not fulfilled.
 */
export function foldWhileManaged<A, S>(
  s: S,
  cont: (s: S) => boolean,
  f: (s: S, o: A) => S
): <R, E>(ma: Stream<R, E, A>) => M.Managed<R, E, S> {
  return (ma) => foldWhileManaged_(ma, s, cont, f)
}

/**
 * Executes an effectful fold over the stream of values.
 * Returns a Managed value that represents the scope of the stream.
 * Stops the fold early when the condition is not fulfilled.
 */
export function foldWhileManagedM_<R, E, A, R1, E1, S>(
  ma: Stream<R, E, A>,
  s: S,
  cont: (s: S) => boolean,
  f: (s: S, a: A) => I.IO<R1, E1, S>
): M.Managed<R & R1, E | E1, S> {
  return pipe(
    ma.proc,
    M.bind((is) => {
      const loop = (s1: S): I.IO<R & R1, E | E1, S> => {
        if (!cont(s)) {
          return I.succeed(s1)
        } else {
          return pipe(
            is,
            I.matchM(
              O.match(() => I.succeed(s1), I.fail),
              flow(C.foldlM(s1, f), I.bind(loop))
            )
          )
        }
      }
      return I.toManaged_(loop(s))
    })
  )
}

/**
 * Executes an effectful fold over the stream of values.
 * Returns a Managed value that represents the scope of the stream.
 * Stops the fold early when the condition is not fulfilled.
 */
export function foldWhileManagedM<A, R1, E1, S>(
  s: S,
  cont: (s: S) => boolean,
  f: (s: S, a: A) => I.IO<R1, E1, S>
): <R, E>(ma: Stream<R, E, A>) => M.Managed<R & R1, E | E1, S> {
  return (ma) => foldWhileManagedM_(ma, s, cont, f)
}

/**
 * Schedules the output of the stream using the provided `schedule`.
 */
export function schedule_<R, R1, E, A>(
  self: Stream<R, E, A>,
  schedule: Schedule<R1, A, any>
): Stream<R & R1 & Has<Clock>, E, A> {
  return filterMap_(
    scheduleEither_(self, schedule),
    E.match(
      (_) => O.None(),
      (a) => O.Some(a)
    )
  )
}

/**
 * Schedules the output of the stream using the provided `schedule`.
 */
export function schedule<R1, I>(schedule: Schedule<R1, I, any>) {
  return <R, E, A extends I>(self: Stream<R, E, A>) => schedule_(self, schedule)
}

/**
 * Schedules the output of the stream using the provided `schedule` and emits its output at
 * the end (if `schedule` is finite).
 */
export function scheduleEither_<R, E, A, R1, B>(
  ma: Stream<R, E, A>,
  schedule: Schedule<R1, A, B>
): Stream<R & R1 & Has<Clock>, E, E.Either<B, A>> {
  return scheduleWith(schedule)(E.Right, E.Left)(ma)
}

/**
 * Schedules the output of the stream using the provided `schedule` and emits its output at
 * the end (if `schedule` is finite).
 */
export function scheduleEither<R1, A, B>(schedule: Schedule<R1, A, B>) {
  return <R, E>(ma: Stream<R, E, A>) => scheduleEither_(ma, schedule)
}

/**
 * Schedules the output of the stream using the provided `schedule` and emits its output at
 * the end (if `schedule` is finite).
 * Uses the provided function to align the stream and schedule outputs on the same type.
 */
export function scheduleWith<R1, A, B>(schedule: Sc.Schedule<R1, A, B>) {
  return <C, D>(f: (a: A) => C, g: (b: B) => D) => <R, E>(
    self: Stream<R, E, A>
  ): Stream<R & R1 & Has<Clock>, E, C | D> => {
    return new Stream(
      M.gen(function* (_) {
        const os     = yield* _(pipe(self.proc, M.mapM(BPull.make)))
        const driver = yield* _(Sc.driver(schedule))

        const pull = pipe(
          os,
          BPull.pullElement,
          I.bind((o) =>
            pipe(
              driver.next(o),
              I.as(() => C.pure(f(o))),
              I.orElse(() =>
                pipe(
                  driver.last,
                  I.orDie,
                  I.map((b) => tuple(f(o), g(b))),
                  I.apl(driver.reset)
                )
              )
            )
          )
        )

        return pull
      })
    )
  }
}

export function take_<R, E, A>(ma: Stream<R, E, A>, n: number): Stream<R, E, A> {
  if (n <= 0) {
    return empty
  } else {
    return new Stream(
      M.gen(function* (_) {
        const chunks     = yield* _(ma.proc)
        const counterRef = yield* _(Ref.make(0))

        const pull = pipe(
          counterRef.get,
          I.bind((count) => {
            if (count >= n) {
              return Pull.end
            } else {
              return I.gen(function* (_) {
                const chunk = yield* _(chunks)
                const taken = chunk.length <= n - count ? chunk : C.take_(chunk, n - count)
                yield* _(counterRef.set(count + taken.length))
                return taken
              })
            }
          })
        )
        return pull
      })
    )
  }
}

/**
 * Takes the specified number of elements from this stream.
 */
export function take(n: number): <R, E, A>(ma: Stream<R, E, A>) => Stream<R, E, A> {
  return (ma) => take_(ma, n)
}

/**
 * Takes all elements of the stream until the specified predicate evaluates
 * to `true`.
 */
export function takeUntil_<R, E, A>(ma: Stream<R, E, A>, pred: Predicate<A>): Stream<R, E, A> {
  return new Stream(
    M.gen(function* (_) {
      const chunks        = yield* _(ma.proc)
      const keepTakingRef = yield* _(Ref.make(true))
      const pull          = pipe(
        keepTakingRef.get,
        I.bind((keepTaking) => {
          if (!keepTaking) {
            return Pull.end
          } else {
            return I.gen(function* (_) {
              const chunk = yield* _(chunks)
              const taken = C.takeWhile_(chunk, not(pred))
              const last  = pipe(chunk, C.drop(taken.length), C.take(1))
              yield* _(
                pipe(
                  keepTakingRef.set(false),
                  I.when(() => C.isNonEmpty(last))
                )
              )
              return C.concat_(taken, last)
            })
          }
        })
      )
      return pull
    })
  )
}

/**
 * Takes all elements of the stream until the specified predicate evaluates
 * to `true`.
 */
export function takeUntil<A>(pred: Predicate<A>): <R, E>(ma: Stream<R, E, A>) => Stream<R, E, A> {
  return (ma) => takeUntil_(ma, pred)
}

/**
 * Takes all elements of the stream until the specified effectual predicate
 * evaluates to `true`.
 */
export function takeUntilM_<R, E, A, R1, E1>(
  ma: Stream<R, E, A>,
  pred: (a: A) => I.IO<R1, E1, boolean>
): Stream<R & R1, E | E1, A> {
  return new Stream(
    M.gen(function* (_) {
      const chunks        = yield* _(ma.proc)
      const keepTakingRef = yield* _(Ref.make(true))
      const pull          = pipe(
        keepTakingRef.get,
        I.bind((keepTaking) => {
          if (!keepTaking) {
            return Pull.end
          } else {
            return I.gen(function* (_) {
              const chunk = yield* _(chunks)
              const taken = yield* _(
                pipe(
                  C.takeWhileM_(
                    chunk,
                    flow(
                      pred,
                      I.map((_) => !_)
                    )
                  ),
                  I.asSomeError
                ) as I.IO<R1, O.Option<E | E1>, Chunk<A>>
              )
              const last  = pipe(chunk, C.drop(taken.length), C.take(1))
              yield* _(
                pipe(
                  keepTakingRef.set(false),
                  I.when(() => C.isNonEmpty(last))
                )
              )
              return C.concat_(taken, last)
            })
          }
        })
      )
      return pull
    })
  )
}

/**
 * Takes all elements of the stream until the specified effectual predicate
 * evaluates to `true`.
 */
export function takeUntilM<A, R1, E1>(
  pred: (a: A) => I.IO<R1, E1, boolean>
): <R, E>(ma: Stream<R, E, A>) => Stream<R & R1, E | E1, A> {
  return (ma) => takeUntilM_(ma, pred)
}

/**
 * Takes all elements of the stream for as long as the specified predicate
 * evaluates to `true`.
 */
export function takeWhile_<R, E, A>(ma: Stream<R, E, A>, pred: Predicate<A>): Stream<R, E, A> {
  return new Stream(
    M.gen(function* (_) {
      const chunks  = yield* _(ma.proc)
      const doneRef = yield* _(Ref.make(false))
      const pull    = pipe(
        doneRef.get,
        I.bind((done) => {
          if (done) {
            return Pull.end
          } else {
            return I.gen(function* (_) {
              const chunk = yield* _(chunks)
              const taken = C.takeWhile_(chunk, pred)
              yield* _(
                pipe(
                  doneRef.set(true),
                  I.when(() => taken.length < chunk.length)
                )
              )
              return taken
            })
          }
        })
      )
      return pull
    })
  )
}

/**
 * Takes all elements of the stream for as long as the specified predicate
 * evaluates to `true`.
 */
export function takeWhile<A>(pred: Predicate<A>): <R, E>(ma: Stream<R, E, A>) => Stream<R, E, A> {
  return (ma) => takeWhile_(ma, pred)
}

/**
 * Throttles the chunks of this stream according to the given bandwidth parameters using the token bucket
 * algorithm. Allows for burst in the processing of elements by allowing the token bucket to accumulate
 * tokens up to a `units + burst` threshold. Chunks that do not meet the bandwidth constraints are dropped.
 * The weight of each chunk is determined by the `costFn` function.
 */
export function throttleEnforce_<R, E, A>(
  ma: Stream<R, E, A>,
  costFn: (chunk: Chunk<A>) => number,
  units: number,
  duration: number,
  burst = 0
): Stream<R & Has<Clock>, E, A> {
  return throttleEnforceM_(ma, flow(costFn, I.succeed), units, duration, burst)
}

/**
 * Throttles the chunks of this stream according to the given bandwidth parameters using the token bucket
 * algorithm. Allows for burst in the processing of elements by allowing the token bucket to accumulate
 * tokens up to a `units + burst` threshold. Chunks that do not meet the bandwidth constraints are dropped.
 * The weight of each chunk is determined by the `costFn` function.
 */
export function throttleEnforce<A>(
  costFn: (chunk: Chunk<A>) => number,
  units: number,
  duration: number,
  burst = 0
): <R, E>(ma: Stream<R, E, A>) => Stream<R & Has<Clock>, E, A> {
  return (ma) => throttleEnforce_(ma, costFn, units, duration, burst)
}

/**
 * Throttles the chunks of this stream according to the given bandwidth parameters using the token bucket
 * algorithm. Allows for burst in the processing of elements by allowing the token bucket to accumulate
 * tokens up to a `units + burst` threshold. Chunks that do not meet the bandwidth constraints are dropped.
 * The weight of each chunk is determined by the `costFn` effectful function.
 */
export function throttleEnforceM_<R, E, A, R1, E1>(
  ma: Stream<R, E, A>,
  costFn: (chunk: Chunk<A>) => I.IO<R1, E1, number>,
  units: number,
  duration: number,
  burst = 0
): Stream<R & R1 & Has<Clock>, E | E1, A> {
  return new Stream(
    M.gen(function* (_) {
      const chunks                                                      = yield* _(ma.proc)
      const time                                                        = yield* _(Clock.currentTime)
      const bucket                                                      = yield* _(Ref.make(tuple(units, time)))
      const pull: I.IO<R & R1 & Has<Clock>, O.Option<E | E1>, Chunk<A>> = pipe(
        chunks,
        I.bind((chunk) =>
          pipe(
            costFn(chunk),
            I.mapError(O.Some),
            I.cross(Clock.currentTime),
            I.bind(([weight, current]) =>
              Ref.modify_(bucket, ([tokens, timestamp]) => {
                const elapsed   = current - timestamp
                const cycles    = elapsed / duration
                const available = (() => {
                  const sum = tokens + cycles * units
                  const max = units + burst < 0 ? Number.MAX_VALUE : units + burst
                  return sum < 0 ? max : Math.min(sum, max)
                })()
                if (weight <= available) {
                  return tuple(O.Some(chunk), tuple(available - weight, current))
                } else {
                  return tuple(O.None(), tuple(available, current))
                }
              })
            ),
            I.bind(O.match(() => pull, I.succeed))
          )
        )
      )
      return pull
    })
  )
}

/**
 * Throttles the chunks of this stream according to the given bandwidth parameters using the token bucket
 * algorithm. Allows for burst in the processing of elements by allowing the token bucket to accumulate
 * tokens up to a `units + burst` threshold. Chunks that do not meet the bandwidth constraints are dropped.
 * The weight of each chunk is determined by the `costFn` effectful function.
 */
export function throttleEnforceM<A, R1, E1>(
  costFn: (chunk: Chunk<A>) => I.IO<R1, E1, number>,
  units: number,
  duration: number,
  burst = 0
): <R, E>(ma: Stream<R, E, A>) => Stream<R & R1 & Has<Clock>, E | E1, A> {
  return (ma) => throttleEnforceM_(ma, costFn, units, duration, burst)
}

export function throttleShapeM_<R, E, A, R1, E1>(
  ma: Stream<R, E, A>,
  costFn: (chunk: Chunk<A>) => I.IO<R1, E1, number>,
  units: number,
  duration: number,
  burst = 0
): Stream<R & R1 & Has<Clock>, E | E1, A> {
  return new Stream(
    M.gen(function* (_) {
      const chunks = yield* _(ma.proc)
      const time   = yield* _(Clock.currentTime)
      const bucket = yield* _(Ref.make(tuple(units, time)))
      const pull   = I.gen(function* (_) {
        const chunk   = yield* _(chunks)
        const weight  = yield* _(I.mapError_(costFn(chunk), O.Some) as I.IO<R1, O.Option<E | E1>, number>)
        const current = yield* _(Clock.currentTime)
        const delay   = yield* _(
          Ref.modify_(bucket, ([tokens, timestamp]) => {
            const elapsed   = current - timestamp
            const cycles    = elapsed / duration
            const available = (() => {
              const sum = tokens + cycles * units
              const max = units + burst < 0 ? Number.MAX_VALUE : units + burst
              return sum < 0 ? max : Math.min(sum, max)
            })()
            const remaining  = available - weight
            const waitCycles = remaining >= 0 ? 0 : -remaining / units
            const delay      = waitCycles * duration
            return tuple(delay, tuple(remaining, current))
          })
        )
        yield* _(
          pipe(
            I.sleep(delay),
            I.when(() => delay > 0)
          )
        )
        return chunk
      })
      return pull
    })
  )
}

export function throttleShapeM<A, R1, E1>(
  costFn: (chunk: Chunk<A>) => I.IO<R1, E1, number>,
  units: number,
  duration: number,
  burst = 0
): <R, E>(ma: Stream<R, E, A>) => Stream<R & R1 & Has<Clock>, E | E1, A> {
  return (ma) => throttleShapeM_(ma, costFn, units, duration, burst)
}

export function debounce_<R, E, A>(ma: Stream<R, E, A>, d: number): Stream<R & Has<Clock>, E, A> {
  interface NotStarted {
    _tag: 'NotStarted'
  }
  interface Previous {
    _tag: 'Previous'
    fiber: Fiber<never, A>
  }
  interface Current {
    _tag: 'Current'
    fiber: Fiber<Option<E>, Chunk<A>>
  }
  interface Done {
    _tag: 'Done'
  }
  type State = NotStarted | Previous | Current | Done

  return new Stream(
    M.gen(function* (_) {
      const chunks = yield* _(ma.proc)
      const ref    = yield* _(
        pipe(
          Ref.make<State>({ _tag: 'NotStarted' }),
          I.toManaged((ref) =>
            I.bind_(
              ref.get,
              flow(
                matchTag(
                  {
                    Previous: ({ fiber }) => Fi.interrupt(fiber),
                    Current: ({ fiber }) => Fi.interrupt(fiber)
                  },
                  () => I.unit()
                ),
                I.asUnit
              )
            )
          )
        )
      )
      const store  = (chunk: Chunk<A>) =>
        pipe(
          chunk,
          C.last,
          O.map((last) =>
            pipe(
              I.sleep(d),
              I.as(() => last),
              I.forkDaemon,
              I.bind((f) => ref.set({ _tag: 'Previous', fiber: f }))
            )
          ),
          O.getOrElse(() => ref.set({ _tag: 'NotStarted' })),
          I.as(() => C.empty<A>())
        )

      const pull = pipe(
        ref.get,
        I.bind(
          matchTag({
            Previous: ({ fiber }) =>
              pipe(
                fiber,
                Fi.join,
                I.raceWith(
                  chunks,
                  (ex, current) =>
                    Ex.match_(
                      ex,
                      (cause): I.IO<R & Has<Clock>, Option<E>, Chunk<A>> =>
                        I.apr_(Fi.interrupt(current), Pull.halt(cause)),
                      (value) => I.as_(ref.set({ _tag: 'Current', fiber: current }), () => C.pure(value))
                    ),
                  (ex, previous) =>
                    Ex.match_(
                      ex,
                      flow(
                        Ca.sequenceCauseOption,
                        O.match(
                          (): I.IO<R & Has<Clock>, Option<E>, Chunk<A>> =>
                            pipe(Fi.join(previous), I.map(C.pure), I.apl(ref.set({ _tag: 'Done' }))),
                          (e) => I.apr_(Fi.interrupt(previous), Pull.halt(e))
                        )
                      ),
                      (chunk): I.IO<R & Has<Clock>, Option<E>, Chunk<A>> =>
                        C.isEmpty(chunk) ? Pull.empty<A>() : I.apr_(Fi.interrupt(previous), store(chunk))
                    ),
                  O.Some(globalScope)
                )
              ),
            Current: ({ fiber }) => I.bind_(Fi.join(fiber), store),
            NotStarted: () => I.bind_(chunks, store),
            Done: () => Pull.end
          })
        )
      )
      return pull
    })
  )
}

export function debounce(d: number): <R, E, A>(ma: Stream<R, E, A>) => Stream<R & Has<Clock>, E, A> {
  return (ma) => debounce_(ma, d)
}

/**
 * A stream that emits Unit values spaced by the specified duration.
 */
export function tick(interval: number): Stream<Has<Clock>, never, void> {
  return repeatWith_(undefined, Sc.spaced(interval))
}

export function toAsyncIterable<R, E, A>(ma: Stream<R, E, A>): Managed<R, never, AsyncIterable<E.Either<E, A>>> {
  return M.gen(function* (_) {
    const runtime = yield* _(I.runtime<R>())
    const pull    = yield* _(ma.proc)

    return {
      [Symbol.asyncIterator](): AsyncIterator<E.Either<E, A>> {
        let currentChunk: A[] = []
        return {
          async next(): Promise<IteratorResult<E.Either<E, A>>> {
            if (currentChunk.length > 0) {
              const v = currentChunk.pop()!
              return { done: false, value: E.Right(v) }
            } else {
              const result = await runtime.runPromiseExit(pull)
              switch (result._tag) {
                case 'Success': {
                  const c      = Array.from(result.value).reverse()
                  const v      = c.pop()!
                  currentChunk = c
                  return { done: false, value: E.Right(v) }
                }
                case 'Failure': {
                  const f = Ca.failureOrCause(result.cause)
                  return E.match_(
                    f,
                    O.match(
                      () => ({ value: null, done: true }),
                      (e) => ({ value: E.Left(e), done: true })
                    ),
                    (ca) => {
                      throw new Ca.FiberFailure(ca)
                    }
                  )
                }
              }
            }
          }
        }
      }
    }
  })
}

/**
 * Converts the stream to a managed queue of chunks. After the managed queue is used,
 * the queue will never again produce values and should be discarded.
 */
export function toQueue_<R, E, A>(
  ma: Stream<R, E, A>,
  capacity = 2
): M.Managed<R, never, Queue.Dequeue<Take.Take<E, A>>> {
  return M.gen(function* (_) {
    const queue = yield* _(I.toManaged_(Queue.makeBounded<Take.Take<E, A>>(capacity), (q) => q.shutdown))
    yield* _(M.fork(intoManaged_(ma, queue)))
    return queue
  })
}

/**
 * Converts the stream to a managed queue of chunks. After the managed queue is used,
 * the queue will never again produce values and should be discarded.
 */
export function toQueue(
  capacity = 2
): <R, E, A>(ma: Stream<R, E, A>) => M.Managed<R, never, Queue.Dequeue<Take.Take<E, A>>> {
  return (ma) => toQueue_(ma, capacity)
}

/**
 * Converts the stream into an unbounded managed queue. After the managed queue
 * is used, the queue will never again produce values and should be discarded.
 */
export function toQueueUnbounded<R, E, A>(ma: Stream<R, E, A>): M.Managed<R, never, Queue.Dequeue<Take.Take<E, A>>> {
  return M.gen(function* (_) {
    const queue = yield* _(I.toManaged_(Queue.makeUnbounded<Take.Take<E, A>>(), (q) => q.shutdown))
    yield* _(M.fork(intoManaged_(ma, queue)))
    return queue
  })
}

/**
 * Creates a stream produced from an effect
 */
export function unwrap<R, E, A>(fa: I.IO<R, E, Stream<R, E, A>>): Stream<R, E, A> {
  return flatten(fromEffect(fa))
}

/**
 * Creates a stream produced from a `Managed`
 */
export function unwrapManaged<R, E, A>(fa: M.Managed<R, E, Stream<R, E, A>>): Stream<R, E, A> {
  return flatten(managed(fa))
}

/**
 * Threads the stream through the transformation function `f`.
 */
export function via_<R, E, A, R1, E1, A1>(
  ma: Stream<R, E, A>,
  f: (stream: Stream<R, E, A>) => Stream<R1, E1, A1>
): Stream<R1, E1, A1> {
  return f(ma)
}

/**
 * Threads the stream through the transformation function `f`.
 */
export function via<R, E, A, R1, E1, A1>(
  f: (stream: Stream<R, E, A>) => Stream<R1, E1, A1>
): (ma: Stream<R, E, A>) => Stream<R1, E1, A1> {
  return f
}

/**
 * Creates a stream by peeling off the "layers" of a value of type `S`
 */
export function unfold<S, A>(s: S, f: (s: S) => Option<readonly [A, S]>): Stream<unknown, never, A> {
  return unfoldM(s, (s) => I.succeed(f(s)))
}

/**
 * Creates a stream by effectfully peeling off the "layers" of a value of type `S`
 */
export function unfoldM<S, R, E, A>(s: S, f: (s: S) => I.IO<R, E, Option<readonly [A, S]>>): Stream<R, E, A> {
  return unfoldChunkM(s, flow(f, I.map(O.map(([o, z]) => [[o], z]))))
}

/**
 * Creates a stream by peeling off the "layers" of a value of type `S`.
 */
export function unfoldChunk<S, A>(
  s: S,
  f: (s: S) => Option<readonly [Chunk<A>, S]>
): Stream<unknown, never, A> {
  return unfoldChunkM(s, (s) => I.succeed(f(s)))
}

/**
 * Creates a stream by effectfully peeling off the "layers" of a value of type `S`
 */
export function unfoldChunkM<S, R, E, A>(
  s: S,
  f: (s: S) => I.IO<R, E, Option<readonly [Chunk<A>, S]>>
): Stream<R, E, A> {
  return new Stream(
    M.gen(function* (_) {
      const doneRef = yield* _(Ref.make(false))
      const ref     = yield* _(Ref.make(s))

      const pull = pipe(
        doneRef.get,
        I.bind((done) => {
          if (done) {
            return Pull.end
          } else {
            return pipe(
              ref.get,
              I.bind(f),
              I.matchM(
                Pull.fail,
                O.match(
                  () => pipe(doneRef.set(true), I.apr(Pull.end)),
                  ([as, z]) =>
                    pipe(
                      ref.set(z),
                      I.as(() => as)
                    )
                )
              )
            )
          }
        })
      )
      return pull
    })
  )
}

export function zipAll_<R, E, A, R1, E1, B>(
  ma: Stream<R, E, A>,
  mb: Stream<R1, E1, B>,
  defLeft: A,
  defRight: B
): Stream<R & R1, E | E1, readonly [A, B]> {
  return zipAllWith_(
    ma,
    mb,
    (o) => tuple(o, defRight),
    (o1) => tuple(defLeft, o1),
    tuple
  )
}

export function zipAll<A, R1, E1, B>(
  mb: Stream<R1, E1, B>,
  defLeft: A,
  defRight: B
): <R, E>(ma: Stream<R, E, A>) => Stream<R & R1, E | E1, readonly [A, B]> {
  return (ma) => zipAll_(ma, mb, defLeft, defRight)
}

/**
 * Zips this stream with another point-wise, and keeps only elements from this stream.
 *
 * The provided default value will be used if the other stream ends before this one.
 */
export function zipAllLeft_<R, E, A, R1, E1, B>(
  ma: Stream<R, E, A>,
  mb: Stream<R1, E1, B>,
  def: A
): Stream<R & R1, E | E1, A> {
  return zipAllWith_(
    ma,
    mb,
    identity,
    () => def,
    (o, _) => o
  )
}

/**
 * Zips this stream with another point-wise, and keeps only elements from this stream.
 *
 * The provided default value will be used if the other stream ends before this one.
 */
export function zipAllLeft<A, R1, E1, B>(
  mb: Stream<R1, E1, B>,
  def: A
): <R, E>(ma: Stream<R, E, A>) => Stream<R & R1, E | E1, A> {
  return (ma) => zipAllLeft_(ma, mb, def)
}

/**
 * Zips this stream with another point-wise, and keeps only elements from the other stream.
 *
 * The provided default value will be used if this stream ends before the other one.
 */
export function zipAllRight_<R, E, A, R1, E1, B>(
  ma: Stream<R, E, A>,
  mb: Stream<R1, E1, B>,
  def: B
): Stream<R & R1, E | E1, B> {
  return zipAllWith_(
    ma,
    mb,
    () => def,
    identity,
    (_, o1) => o1
  )
}

/**
 * Zips this stream with another point-wise, and keeps only elements from the other stream.
 *
 * The provided default value will be used if this stream ends before the other one.
 */
export function zipAllRight<A, R1, E1, B>(
  mb: Stream<R1, E1, B>,
  def: B
): <R, E>(ma: Stream<R, E, A>) => Stream<R & R1, E | E1, B> {
  return (ma) => zipAllRight_(ma, mb, def)
}

/**
 * Zips this stream with another point-wise. The provided functions will be used to create elements
 * for the composed stream.
 *
 * The functions `left` and `right` will be used if the streams have different lengths
 * and one of the streams has ended before the other.
 */
export function zipAllWith_<R, E, A, R1, E1, B, C>(
  ma: Stream<R, E, A>,
  mb: Stream<R1, E1, B>,
  left: (a: A) => C,
  right: (b: B) => C,
  both: (a: A, b: B) => C
): Stream<R & R1, E | E1, C> {
  return zipAllWithExec_(ma, mb, parallel, left, right, both)
}

/**
 * Zips this stream with another point-wise. The provided functions will be used to create elements
 * for the composed stream.
 *
 * The functions `left` and `right` will be used if the streams have different lengths
 * and one of the streams has ended before the other.
 */
export function zipAllWith<A, R1, E1, B, C>(
  mb: Stream<R1, E1, B>,
  left: (a: A) => C,
  right: (b: B) => C,
  both: (a: A, b: B) => C
): <R, E>(ma: Stream<R, E, A>) => Stream<R & R1, E | E1, C> {
  return (ma) => zipAllWith_(ma, mb, left, right, both)
}

/**
 * Zips this stream with another point-wise. The provided functions will be used to create elements
 * for the composed stream.
 *
 * The functions `left` and `right` will be used if the streams have different lengths
 * and one of the streams has ended before the other.
 *
 * The execution strategy `exec` will be used to determine whether to pull
 * from the streams sequentially or in parallel.
 */
export function zipAllWithExec_<R, E, A, R1, E1, B, C>(
  ma: Stream<R, E, A>,
  mb: Stream<R1, E1, B>,
  exec: ExecutionStrategy,
  left: (a: A) => C,
  right: (b: B) => C,
  both: (a: A, b: B) => C
): Stream<R & R1, E | E1, C> {
  interface Running {
    readonly _tag: 'Running'
  }
  interface LeftDone {
    readonly _tag: 'LeftDone'
  }
  interface RightDone {
    readonly _tag: 'RightDone'
  }
  interface End {
    readonly _tag: 'End'
  }
  type Status = Running | LeftDone | RightDone | End
  type State = readonly [Status, E.Either<Chunk<A>, Chunk<B>>]

  const handleSuccess = (
    maybeO: O.Option<Chunk<A>>,
    maybeO1: O.Option<Chunk<B>>,
    excess: E.Either<Chunk<A>, Chunk<B>>
  ): Ex.Exit<never, readonly [Chunk<C>, State]> => {
    const [excessL, excessR] = E.match_(
      excess,
      (l) => tuple(l, C.empty<B>()),
      (r) => tuple(C.empty<A>(), r)
    )
    const chunkL             = O.match_(
      maybeO,
      () => excessL,
      (upd) => C.concat_(excessL, upd)
    )
    const chunkR             = O.match_(
      maybeO1,
      () => excessR,
      (upd) => C.concat_(excessR, upd)
    )
    const [emit, newExcess]  = _zipChunks(chunkL, chunkR, both)
    const [fullEmit, status] = O.isSome(maybeO)
      ? O.isSome(maybeO1)
        ? tuple(emit, <Status>{ _tag: 'Running' })
        : tuple(emit, <Status>{ _tag: 'RightDone' })
      : O.isSome(maybeO1)
      ? tuple(emit, <Status>{ _tag: 'LeftDone' })
      : tuple(C.concat_(emit, E.match_(newExcess, C.map(left), C.map(right))), <Status>{ _tag: 'End' })

    return Ex.succeed([fullEmit, [status, newExcess]])
  }

  return combineChunks_(
    ma,
    mb,
    tuple(<Status>{ _tag: 'Running' }, E.Left<Chunk<A>, Chunk<B>>(C.empty())),
    ([state, excess], pullL, pullR) => {
      switch (state._tag) {
        case 'Running': {
          switch (exec._tag) {
            case 'Sequential': {
              return pipe(
                pullL,
                I.optional,
                I.crossWith(I.optional(pullR), (l, r) => handleSuccess(l, r, excess)),
                I.catchAllCause(flow(Ca.map(O.Some), Ex.halt, I.succeed))
              )
            }
            default: {
              return pipe(
                pullL,
                I.optional,
                I.crossWithPar(I.optional(pullR), (l, r) => handleSuccess(l, r, excess)),
                I.catchAllCause(flow(Ca.map(O.Some), Ex.halt, I.succeed))
              )
            }
          }
        }
        case 'LeftDone': {
          return pipe(
            pullR,
            I.optional,
            I.map((r) => handleSuccess(O.None(), r, excess)),
            I.catchAllCause(flow(Ca.map(O.Some), Ex.halt, I.succeed))
          )
        }
        case 'RightDone': {
          return pipe(
            pullL,
            I.optional,
            I.map((l) => handleSuccess(l, O.None(), excess)),
            I.catchAllCause(flow(Ca.map(O.Some), Ex.halt, I.succeed))
          )
        }
        case 'End': {
          return pipe(O.None(), Ex.fail, I.succeed)
        }
      }
    }
  )
}

/**
 * Zips this stream with another point-wise. The provided functions will be used to create elements
 * for the composed stream.
 *
 * The functions `left` and `right` will be used if the streams have different lengths
 * and one of the streams has ended before the other.
 *
 * The execution strategy `exec` will be used to determine whether to pull
 * from the streams sequentially or in parallel.
 */
export function zipAllWithExec<A, R1, E1, B, C>(
  mb: Stream<R1, E1, B>,
  exec: ExecutionStrategy,
  left: (a: A) => C,
  right: (b: B) => C,
  both: (a: A, b: B) => C
): <R, E>(ma: Stream<R, E, A>) => Stream<R & R1, E | E1, C> {
  return (ma) => zipAllWithExec_(ma, mb, exec, left, right, both)
}

/**
 * Zips this stream with another point-wise and applies the function to the paired elements.
 *
 * The new stream will end when one of the sides ends.
 */
export function zipWith_<R, E, A, R1, E1, B, C>(
  me: Stream<R, E, A>,
  that: Stream<R1, E1, B>,
  f: (a: A, b: B) => C
): Stream<R & R1, E | E1, C> {
  return zipWithExec_(me, that, f, sequential)
}

/**
 * Zips this stream with another point-wise and applies the function to the paired elements.
 *
 * The new stream will end when one of the sides ends.
 */
export function zipWith<A, R1, E1, B, C>(
  that: Stream<R1, E1, B>,
  f: (a: A, b: B) => C
): <R, E>(me: Stream<R, E, A>) => Stream<R & R1, E1 | E, C> {
  return (me) => zipWith_(me, that, f)
}

function _zipChunks<A, B, C>(
  fa: Chunk<A>,
  fb: Chunk<B>,
  f: (a: A, b: B) => C
): [Chunk<C>, E.Either<Chunk<A>, Chunk<B>>] {
  const mut_fc: Array<C> = []

  const len = Math.min(fa.length, fb.length)
  for (let i = 0; i < len; i++) {
    mut_fc[i] = f(fa[i], fb[i])
  }

  if (fa.length > fb.length) {
    return [mut_fc, E.Left(C.drop_(fa, fb.length))]
  }

  return [mut_fc, E.Right(C.drop_(fb, fa.length))]
}

/**
 * Zips this stream together with the index of elements.
 */
export function zipWithIndex<R, E, A>(ma: Stream<R, E, A>): Stream<R, E, readonly [A, number]> {
  return mapAccum_(ma, 0, (index, a) => tuple(index + 1, tuple(a, index)))
}

/**
 * Zips this stream with another point-wise and applies the function to the paired elements.
 *
 * The new stream will end when one of the sides ends.
 *
 * By default pull is executed in parallel to preserve async semantics, see `zipWith` for
 * a sequential alternative
 */
export function zipWithExec_<R, E, A, R1, E1, B, C>(
  ma: Stream<R, E, A>,
  mb: Stream<R1, E1, B>,
  f: (a: A, b: B) => C,
  exec: ExecutionStrategy
): Stream<R & R1, E1 | E, C> {
  type End = { _tag: 'End' }
  type RightDone<W2> = { _tag: 'RightDone', excessR: Chunk<W2> }
  type LeftDone<W1> = { _tag: 'LeftDone', excessL: Chunk<W1> }
  type Running<W1, W2> = {
    _tag: 'Running'
    excess: E.Either<Chunk<W1>, Chunk<W2>>
  }
  type State<W1, W2> = End | Running<W1, W2> | LeftDone<W1> | RightDone<W2>

  const handleSuccess = (
    leftUpd: Option<Chunk<A>>,
    rightUpd: Option<Chunk<B>>,
    excess: E.Either<Chunk<A>, Chunk<B>>
  ): Ex.Exit<Option<never>, readonly [Chunk<C>, State<A, B>]> => {
    const [leftExcess, rightExcess] = pipe(
      excess,
      E.match(
        (l) => tuple<[Chunk<A>, Chunk<B>]>(l, C.empty()),
        (r) => tuple<[Chunk<A>, Chunk<B>]>(C.empty(), r)
      )
    )

    const [left, right] = [
      pipe(
        leftUpd,
        O.match(
          () => leftExcess,
          (upd) => C.concat_(leftExcess, upd)
        )
      ),
      pipe(
        rightUpd,
        O.match(
          () => rightExcess,
          (upd) => C.concat_(rightExcess, upd)
        )
      )
    ]

    const [emit, newExcess] = _zipChunks(left, right, f)

    if (O.isSome(leftUpd) && O.isSome(rightUpd)) {
      return Ex.succeed(
        tuple<[Chunk<C>, State<A, B>]>(emit, {
          _tag: 'Running',
          excess: newExcess
        })
      )
    } else if (O.isNone(leftUpd) && O.isNone(rightUpd)) {
      return Ex.fail(O.None())
    } else {
      return Ex.succeed(
        tuple(
          emit,
          pipe(
            newExcess,
            E.match(
              (l): State<A, B> =>
                !C.isEmpty(l)
                  ? {
                      _tag: 'LeftDone',
                      excessL: l
                    }
                  : { _tag: 'End' },
              (r): State<A, B> =>
                !C.isEmpty(r)
                  ? {
                      _tag: 'RightDone',
                      excessR: r
                    }
                  : { _tag: 'End' }
            )
          )
        )
      )
    }
  }

  return combineChunks_(
    ma,
    mb,
    <State<A, B>>{
      _tag: 'Running',
      excess: E.Left(C.empty())
    },
    (st, p1, p2) => {
      switch (st._tag) {
        case 'End': {
          return I.pure(Ex.fail(O.None()))
        }
        case 'Running': {
          return pipe(
            p1,
            I.optional,
            exec._tag === 'Sequential'
              ? I.crossWith(I.optional(p2), (l, r) => handleSuccess(l, r, st.excess))
              : I.crossWithPar(I.optional(p2), (l, r) => handleSuccess(l, r, st.excess)),
            I.catchAllCause((e) => I.pure(Ex.halt(pipe(e, Ca.map(O.Some)))))
          )
        }
        case 'LeftDone': {
          return pipe(
            p2,
            I.optional,
            I.map((r) => handleSuccess(O.None(), r, E.Left(st.excessL))),
            I.catchAllCause((e) => I.pure(Ex.halt(pipe(e, Ca.map(O.Some)))))
          )
        }
        case 'RightDone': {
          return pipe(
            p1,
            I.optional,
            I.map((l) => handleSuccess(l, O.None(), E.Right(st.excessR))),
            I.catchAllCause((e) => I.pure(Ex.halt(pipe(e, Ca.map(O.Some)))))
          )
        }
      }
    }
  )
}

export function zipWithExec<A, R1, E1, B, C>(
  mb: Stream<R1, E1, B>,
  f: (a: A, b: B) => C,
  exec: ExecutionStrategy
): <R, E>(ma: Stream<R, E, A>) => Stream<R & R1, E1 | E, C> {
  return (ma) => zipWithExec_(ma, mb, f, exec)
}

export function zipWithPar_<R, E, A, R1, E1, B, C>(
  ma: Stream<R, E, A>,
  mb: Stream<R1, E1, B>,
  f: (a: A, b: B) => C
): Stream<R & R1, E | E1, C> {
  return zipWithExec_(ma, mb, f, parallel)
}

/**
 * Zips this stream with another point-wise and applies the function to the paired elements.
 *
 * The new stream will end when one of the sides ends.
 *
 * By default pull is executed in parallel to preserve async semantics, see `zipWithSeq` for
 * a sequential alternative
 */
export function zipWithPar<A, R1, E1, B, C>(
  mb: Stream<R1, E1, B>,
  f: (a: A, b: B) => C
): <R, E>(ma: Stream<R, E, A>) => Stream<R & R1, E1 | E, C> {
  return (ma) => zipWithPar_(ma, mb, f)
}

/**
 * Zips the two streams so that when a value is emitted by either of the two streams,
 * it is combined with the latest value from the other stream to produce a result.
 *
 * Note: tracking the latest value is done on a per-chunk basis. That means that
 * emitted elements that are not the last value in chunks will never be used for zipping.
 */
export function zipWithLatest_<R, E, A, R1, E1, B, C>(
  ma: Stream<R, E, A>,
  mb: Stream<R1, E1, B>,
  f: (a: A, b: B) => C
): Stream<R & R1, E | E1, C> {
  const pullNonEmpty = <R, E, O>(pull: I.IO<R, Option<E>, Chunk<O>>): I.IO<R, Option<E>, Chunk<O>> =>
    pipe(
      pull,
      I.bind((chunk) => {
        if (C.isEmpty(chunk)) {
          return pullNonEmpty(pull)
        } else {
          return I.succeed(chunk)
        }
      })
    )

  return new Stream(
    M.gen(function* (_) {
      const left  = yield* _(M.map_(ma.proc, pullNonEmpty))
      const right = yield* _(M.map_(mb.proc, pullNonEmpty))

      const pull = yield* _(
        pipe(
          left,
          I.raceWith(
            right,
            (
              leftDone,
              rightFiber
            ): I.IO<unknown, O.Option<E | E1>, readonly [Chunk<A>, Chunk<B>, boolean]> =>
              pipe(
                leftDone,
                I.done,
                I.crossWith(Fi.join(rightFiber), (os, o1s) => [os, o1s, <boolean>true] as const)
              ),
            (rightDone, leftFiber) =>
              pipe(
                rightDone,
                I.done,
                I.crossWith(Fi.join(leftFiber), (o1s, os) => [os, o1s, <boolean>false] as const)
              )
          ),
          fromEffectOption,
          bind(([l, r, leftFirst]) =>
            pipe(
              Ref.make(l[l.length - 1]),
              I.cross(Ref.make(r[r.length - 1])),
              fromEffect,
              bind(([latestLeft, latestRight]) =>
                pipe(
                  fromChunk(
                    leftFirst ? C.map_(r, (o1) => f(l[l.length - 1], o1)) : C.map_(l, (o) => f(o, r[r.length - 1]))
                  ),
                  concat(
                    pipe(
                      left,
                      I.tap((chunk) => latestLeft.set(chunk[chunk.length - 1])),
                      I.cross(latestRight.get),
                      repeatEffectOption,
                      mergeWith(
                        pipe(
                          right,
                          I.tap((chunk) => latestRight.set(chunk[chunk.length - 1])),
                          I.cross(latestLeft.get),
                          repeatEffectOption
                        ),
                        ([leftChunk, rightLatest]) => C.map_(leftChunk, (o) => f(o, rightLatest)),
                        ([rightChunk, leftLatest]) => C.map_(rightChunk, (o1) => f(leftLatest, o1))
                      ),
                      bind(fromChunk)
                    )
                  )
                )
              )
            )
          )
        ).proc
      )
      return pull
    })
  )
}

/**
 * Zips the two streams so that when a value is emitted by either of the two streams,
 * it is combined with the latest value from the other stream to produce a result.
 *
 * Note: tracking the latest value is done on a per-chunk basis. That means that
 * emitted elements that are not the last value in chunks will never be used for zipping.
 */
export function zipWithLatest<A, R1, E1, B, C>(
  mb: Stream<R1, E1, B>,
  f: (a: A, b: B) => C
): <R, E>(ma: Stream<R, E, A>) => Stream<R & R1, E | E1, C> {
  return (ma) => zipWithLatest_(ma, mb, f)
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
      return x._tag === 'None' ? fail(__ ? __() : new NoSuchElementError('Stream.gen')) : succeed(x.value)
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
    <A>(_: () => Option<A>): GenStream<unknown, NoSuchElementError, A>
    <E, A>(_: () => E.Either<E, A>): GenStream<unknown, E, A>
    <R, E, A>(_: () => I.IO<R, E, A>): GenStream<R, E, A>
    <R, E, A>(_: () => Stream<R, E, A>): GenStream<R, E, A>
  }) => Generator<T, A0, any>
) => Stream<_R<T>, _E<T>, A0>
export function gen<E0, A0>(): <T extends GenStream<any, E0, any>>(
  f: (i: {
    <A>(_: () => Tag<A>): GenStream<Has<A>, never, A>
    <E, A>(_: () => Option<A>, onNone: () => E): GenStream<unknown, E, A>
    <A>(_: () => Option<A>): GenStream<unknown, NoSuchElementError, A>
    <E, A>(_: () => E.Either<E, A>): GenStream<unknown, E, A>
    <R, E, A>(_: () => I.IO<R, E, A>): GenStream<R, E, A>
    <R, E, A>(_: () => Stream<R, E, A>): GenStream<R, E, A>
  }) => Generator<T, A0, any>
) => Stream<_R<T>, _E<T>, A0>
export function gen<A0>(): <T extends GenStream<any, any, any>>(
  f: (i: {
    <A>(_: () => Tag<A>): GenStream<Has<A>, never, A>
    <E, A>(_: () => Option<A>, onNone: () => E): GenStream<unknown, E, A>
    <A>(_: () => Option<A>): GenStream<unknown, NoSuchElementError, A>
    <E, A>(_: () => E.Either<E, A>): GenStream<unknown, E, A>
    <R, E, A>(_: () => I.IO<R, E, A>): GenStream<R, E, A>
    <R, E, A>(_: () => Stream<R, E, A>): GenStream<R, E, A>
  }) => Generator<T, A0, any>
) => Stream<_R<T>, _E<T>, A0>
export function gen<T extends GenStream<any, any, any>, A0>(
  f: (i: {
    <A>(_: () => Tag<A>): GenStream<Has<A>, never, A>
    <E, A>(_: () => Option<A>, onNone: () => E): GenStream<unknown, E, A>
    <A>(_: () => Option<A>): GenStream<unknown, NoSuchElementError, A>
    <E, A>(_: () => E.Either<E, A>): GenStream<unknown, E, A>
    <R, E, A>(_: () => I.IO<R, E, A>): GenStream<R, E, A>
    <R, E, A>(_: () => Stream<R, E, A>): GenStream<R, E, A>
  }) => Generator<T, A0, any>
): Stream<_R<T>, _E<T>, A0>
export function gen(...args: any[]): any {
  function gen_<T extends GenStream<any, any, any>, A>(f: (i: any) => Generator<T, A, any>): Stream<_R<T>, _E<T>, A> {
    return defer(() => {
      function run(replayStack: L.List<any>): Stream<any, any, A> {
        const iterator    = f(adapter as any)
        let state         = iterator.next()
        let prematureExit = false
        L.forEach_(replayStack, (a) => {
          if (state.done) prematureExit = true

          state = iterator.next(a)
        })
        if (prematureExit) return fromEffect(I.die(new PrematureGeneratorExitError('Stream.gen')))

        if (state.done) return succeed(state.value)

        return bind_(state.value.S(), (val) => {
          return run(L.append_(replayStack, val))
        })
      }
      return run(L.empty())
    })
  }
  if (args.length === 0) return (f: any) => gen_(f)

  return gen_(args[0])
}

export class GroupBy<R, E, K, V> {
  constructor(
    readonly grouped: Stream<R, E, readonly [K, Queue.Dequeue<Ex.Exit<Option<E>, V>>]>,
    readonly buffer: number
  ) {}
  first(n: number): GroupBy<R, E, K, V> {
    const g1 = pipe(
      this.grouped,
      zipWithIndex,
      filterM((elem) => {
        const [[, q], i] = elem
        if (i < n) {
          return pipe(
            I.succeed(elem),
            I.as(() => true)
          )
        } else {
          return pipe(
            q.shutdown,
            I.as(() => false)
          )
        }
      }),
      map(([grouped, _]) => grouped)
    )
    return new GroupBy(g1, this.buffer)
  }

  filter(f: (k: K) => boolean): GroupBy<R, E, K, V> {
    const g1 = pipe(
      this.grouped,
      filterM((elem) => {
        const [k, q] = elem
        if (f(k)) {
          return pipe(
            I.succeed(elem),
            I.as(() => true)
          )
        } else {
          return pipe(
            q.shutdown,
            I.as(() => false)
          )
        }
      })
    )
    return new GroupBy(g1, this.buffer)
  }

  merge<R1, E1, A>(f: (k: K, s: Stream<unknown, E, V>) => Stream<R1, E1, A>): Stream<R & R1, E | E1, A> {
    return bindPar_(
      this.grouped,
      ([k, q]) => f(k, flattenExitOption(fromQueueWithShutdown(q))),
      Number.MAX_SAFE_INTEGER,
      this.buffer
    )
  }
}
