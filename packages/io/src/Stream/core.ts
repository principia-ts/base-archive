import type { Chunk } from '../Chunk'
import type { Clock, HasClock } from '../Clock'
import type { Fiber } from '../Fiber'
import type { Schedule } from '../Schedule'
import type { Transducer } from './Transducer'
import type { Predicate, Refinement } from '@principia/base/data/Function'
import type { Has, Tag } from '@principia/base/data/Has'
import type { Option } from '@principia/base/data/Option'
import type * as HKT from '@principia/base/HKT'
import type { _E, _R } from '@principia/base/util/types'

import * as E from '@principia/base/data/Either'
import { constTrue, flow, identity, not, pipe, tuple } from '@principia/base/data/Function'
import { isTag } from '@principia/base/data/Has'
import * as L from '@principia/base/data/List'
import * as Map from '@principia/base/data/Map'
import * as O from '@principia/base/data/Option'
import { NoSuchElementException, PrematureGeneratorExit } from '@principia/base/util/GlobalExceptions'

import * as Ca from '../Cause'
import * as C from '../Chunk'
import { sequential } from '../ExecutionStrategy'
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
import * as Semaphore from '../Semaphore'
import * as BPull from './BufferedPull'
import * as Ha from './Handoff'
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
      Ref.modify(([chunk, nextIdx]): [I.IO<R_, Option<E_>, O>, [Chunk<O>, number]] => {
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
      I.bindS('doneRef', () => Ref.make(false)),
      I.letS('pull', ({ doneRef }) =>
        pipe(
          doneRef,
          Ref.modify<I.FIO<Option<never>, Chunk<A>>, boolean>((done) =>
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
  return new Stream(pipe(Ref.make(a), I.toManaged(), M.map(flow(Ref.getAndUpdate(f), I.map(C.single)))))
}

export function suspend<R, E, A>(thunk: () => Stream<R, E, A>): Stream<R, E, A> {
  return new Stream(M.suspend(() => thunk().proc))
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
          I.flatMap((done) => {
            if (done) {
              return Pull.end
            } else {
              return pipe(
                I.gen(function* ($) {
                  const a = yield* $(
                    pipe(
                      ma.io,
                      I.map(([, a]) => a),
                      I.gives((r: R) => tuple(r, finalizer)),
                      restore,
                      I.onError(() => doneRef.set(true))
                    )
                  )
                  yield* $(doneRef.set(true))
                  return C.single(a)
                }),
                I.mapError(O.some)
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
          else return tuple(I.map_(fa, C.single), true)
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
  return pipe(ef, I.mapError(O.some), fromEffectOption)
}

/**
 * Creates a stream from a `Schedule` that does not require any further
 * input. The stream will emit an element for each value output from the
 * schedule, continuing for as long as the schedule continues.
 */
export function fromSchedule<R, A>(schedule: Sc.Schedule<R, unknown, A>): Stream<R & HasClock, never, A> {
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
        M.total(() =>
          register((k, cb) => pipe(Take.fromPull(k), I.flatMap(output.offer), (x) => runtime.runCancel(x, cb)))
        )
      )

      const pull = yield* _(
        O.fold_(
          maybeStream,
          () =>
            M.map_(Ref.makeManaged(false), (doneRef) =>
              pipe(
                doneRef.get,
                I.flatMap((done) => {
                  if (done) {
                    return Pull.end
                  } else {
                    return pipe(
                      output.take,
                      I.flatMap(Take.done),
                      I.onError(() => pipe(doneRef.set(true), I.andThen(output.shutdown)))
                    )
                  }
                })
              )
            ),
          (s) => pipe(output.shutdown, I.toManaged(), M.apSecond(s.proc))
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
    M.gen(function* (_) {
      const output       = yield* _(Queue.makeBounded<Take.Take<E, A>>(outputBuffer))
      const runtime      = yield* _(I.runtime<R>())
      const eitherStream = yield* _(
        M.total(() =>
          register((k, cb) => pipe(Take.fromPull(k), I.flatMap(output.offer), (x) => runtime.runCancel(x, cb)))
        )
      )

      const pull = yield* _(
        E.fold_(
          eitherStream,
          (canceler) =>
            pipe(
              Ref.makeManaged(false),
              M.map((doneRef) =>
                pipe(
                  doneRef.get,
                  I.flatMap((done) => {
                    if (done) {
                      return Pull.end
                    } else {
                      return pipe(
                        output.take,
                        I.flatMap(Take.done),
                        I.onError(() => pipe(doneRef.set(true), I.andThen(output.shutdown)))
                      )
                    }
                  })
                )
              ),
              M.ensuring(canceler)
            ),
          (s) => pipe(output.shutdown, I.toManaged(), M.apSecond(s.proc))
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
      I.map(([a, s]) => tuple(C.single(a), s))
    )
  )
}

/**
 * Like `unfoldChunk`, but allows the emission of values to end one step further than
 * the unfolding of the state. This is useful for embedding paginated APIs,
 * hence the name.
 */
export function paginateChunk<S, A>(s: S, f: (s: S) => readonly [Chunk<A>, Option<S>]): Stream<unknown, never, A> {
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
      const ref = yield* _(Ref.make(O.some(s)))
      return pipe(
        ref.get,
        I.flatMap(
          O.fold(
            () => Pull.end,
            flow(
              f,
              I.foldM(Pull.fail, ([as, s]) =>
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
      yield* _(I.when(() => start >= max)(I.fail(O.none())))
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
      const pull    = I.flatMap_(doneRef.get, (done) => {
        if (done) {
          return Pull.end
        } else {
          return I.tapError_(
            ef,
            O.fold(
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
  return repeatEffectChunkOption(I.mapError_(fa, O.some))
}

/**
 * Creates a stream from an IO producing values of type `A` until it fails with None.
 */
export function repeatEffectOption<R, E, A>(fa: I.IO<R, Option<E>, A>): Stream<R, E, A> {
  return pipe(fa, I.map(C.single), repeatEffectChunkOption)
}

/**
 * Creates a stream from an effect producing a value of type `A` which repeats forever.
 */
export function repeatEffect<R, E, A>(fa: I.IO<R, E, A>): Stream<R, E, A> {
  return repeatEffectOption(I.mapError_(fa, O.some))
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
    I.product(Sc.driver(schedule)),
    fromEffect,
    flatMap(([a, driver]) =>
      pipe(
        succeed(a),
        concat(
          unfoldM(
            a,
            flow(
              driver.next,
              I.foldM(I.succeed, () =>
                pipe(
                  effect,
                  I.map((nextA) => O.some(tuple(nextA, nextA)))
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
export function fromChunkQueue<R, E, O>(queue: Queue.XQueue<never, R, unknown, E, never, Chunk<O>>): Stream<R, E, O> {
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
    I.catchAllCause((c) =>
      I.flatMap_(queue.isShutdown, (down) => (down && Ca.interrupted(c) ? Pull.end : Pull.halt(c)))
    ),
    repeatEffectChunkOption
  )
}

/**
 * Creates a stream from an `XQueue` of values. The queue will be shutdown once the stream is closed.
 */
export function fromQueueWithShutdown<R, E, A>(queue: Queue.XQueue<never, R, unknown, E, never, A>): Stream<R, E, A> {
  return ensuringFirst_(fromQueue(queue), queue.shutdown)
}

export function fromIterable<A>(iterable: () => Iterable<A>): Stream<unknown, never, A> {
  class StreamEnd extends Error {}

  return pipe(
    fromEffect(
      pipe(
        I.total(() => iterable()[Symbol.iterator]()),
        I.product(I.runtime<unknown>())
      )
    ),
    flatMap(([it, rt]) =>
      repeatEffectOption(
        pipe(
          I.partial_(() => {
            const v = it.next()
            if (!v.done) {
              return v.value
            } else {
              throw new StreamEnd()
            }
          }, identity),
          I.catchAll((err) => {
            if (err instanceof StreamEnd) {
              return I.fail(O.none())
            } else {
              return I.die(err)
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
      yield* _(register((k, cb) => pipe(Take.fromPull(k), I.flatMap(output.offer), (x) => runtime.runCancel(x, cb))))
      const doneRef = yield* _(Ref.make(false))
      const pull    = I.flatMap_(doneRef.get, (done) => {
        if (done) {
          return Pull.end
        } else {
          return pipe(
            output.take,
            I.flatMap(Take.done),
            I.onError(() => pipe(doneRef.set(true), I.andThen(output.shutdown)))
          )
        }
      })
      return pull
    }),
    managed,
    flatMap(repeatEffectChunkOption)
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
  return run_(stream, Sink.foreach(f))
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
  return runManaged_(stream, Sink.foreach(f))
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
  return run_(stream, Sink.foreachChunk(f))
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
  return runManaged_(stream, Sink.foreachChunk(f))
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

export const absolve: <R, E, A, E1>(stream: Stream<R, E, E.Either<E1, A>>) => Stream<R, E | E1, A> = flatMap(
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
    pipe(
      fa.proc,
      M.mapM(BPull.make),
      M.map((os) => {
        const pull: Pull.Pull<R & R1, E | E1, O> = pipe(
          os,
          BPull.pullElement,
          I.flatMap((o) =>
            pipe(
              f(o),
              I.mapError(O.some),
              I.flatMap((_) => {
                if (_) return I.succeed(C.single(o))
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

      const go: I.IO<R & R1, O.Option<E | E1>, Chunk<O1>> = I.flatMap_(
        BPull.pullElement(os),
        flow(
          f,
          O.fold(
            () => go,
            I.bimap(O.some, (o1) => [o1])
          )
        )
      )
      return go
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
      M.map((e) => pipe(e, I.flatMap(flow(f, I.mapError<E1, Option<E | E1>>(O.some)))))
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

/**
 * Maps the success values of this stream to the specified constant value.
 */
export function as_<R, E, O, O1>(ma: Stream<R, E, O>, o1: () => O1): Stream<R, E, O1> {
  return map_(ma, () => o1())
}

/**
 * Maps the success values of this stream to the specified constant value.
 */
export function as<O1>(o1: () => O1): <R, E, O>(ma: Stream<R, E, O>) => Stream<R, E, O1> {
  return (ma) => as_(ma, o1)
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
export function flatMap_<R, E, A, R1, E1, B>(
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
export function flatMap<A, Q, D, B>(
  f: (a: A) => Stream<Q, D, B>
): <R, E>(ma: Stream<R, E, A>) => Stream<Q & R, D | E, B> {
  return (ma) => flatMap_(ma, f)
}

/**
 * Flattens this stream-of-streams into a stream made of the concatenation in
 * strict order of all the streams.
 */
export function flatten<R, E, Q, D, A>(ffa: Stream<R, E, Stream<Q, D, A>>): Stream<Q & R, D | E, A> {
  return flatMap_(ffa, identity)
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
  return flatMap_(ask<R0>(), f)
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
 * Combinators
 * -------------------------------------------
 */

/**
 * Submerges the chunks carried by this stream into the stream's structure, while
 * still preserving them.
 */
export function flattenChunks<R, E, O>(stream: Stream<R, E, Chunk<O>>): Stream<R, E, O> {
  return new Stream(pipe(stream.proc, M.mapM(BPull.make), M.map(BPull.pullElement)))
}

/**
 * Unwraps `Exit` values that also signify end-of-stream by failing with `None`.
 */
export function flattenExitOption<R, E, E1, O>(stream: Stream<R, E, Ex.Exit<O.Option<E1>, O>>): Stream<R, E | E1, O> {
  return new Stream(
    M.gen(function* (_) {
      const upstream = yield* _(M.mapM_(stream.proc, BPull.make))
      const doneRef  = yield* _(Ref.make(false))
      const pull     = pipe(
        doneRef.get,
        I.flatMap((done) => {
          if (done) {
            return Pull.end
          } else {
            return pipe(
              BPull.pullElement(upstream),
              I.foldM(
                O.fold(
                  () => pipe(doneRef.set(true), I.andThen(Pull.end)),
                  (e) => Pull.fail(e as E | E1)
                ),
                flow(
                  I.done,
                  I.foldM(
                    O.fold(() => pipe(doneRef.set(true), I.andThen(Pull.end)), Pull.fail),
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
export function flattenTake<R, E, E1, O>(stream: Stream<R, E, Take.Take<E1, O>>): Stream<R, E | E1, O> {
  return pipe(stream, flattenExitOption, flattenChunks)
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
export function aggregateAsyncWithinEither<O, R1, E1, P, Q>(
  transducer: Transducer<R1, E1, O, P>,
  schedule: Schedule<R1, Chunk<P>, Q>
): <R, E>(stream: Stream<R, E, O>) => Stream<R & R1 & HasClock, E | E1, E.Either<Q, P>> {
  return (stream) => aggregateAsyncWithinEither_(stream, transducer, schedule)
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
export function aggregateAsyncWithinEither_<R, E, O, R1, E1, P, Q>(
  stream: Stream<R, E, O>,
  transducer: Transducer<R1, E1, O, P>,
  schedule: Schedule<R1, Chunk<P>, Q>
): Stream<R & R1 & HasClock, E | E1, E.Either<Q, P>> {
  return flattenTake(
    new Stream(
      M.gen(function* (_) {
        const pull         = yield* _(stream.proc)
        const push         = yield* _(transducer.push)
        const handoff      = yield* _(Ha.make<Take.Take<E, O>>())
        const raceNextTime = yield* _(Ref.make(false))
        const waitingFiber = yield* _(Ref.make<O.Option<Fiber<never, Take.Take<E | E1, O>>>>(O.none()))
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

        const updateSchedule: I.URIO<R1 & HasClock, O.Option<Q>> = pipe(
          lastChunk.get,
          I.flatMap(sdriver.next),
          I.fold((_) => O.none(), O.some)
        )

        const waitForProducer: I.URIO<R1, Take.Take<E | E1, O>> = pipe(
          waitingFiber,
          Ref.getAndSet(O.none()),
          I.flatMap(
            O.fold(
              () => Ha.take(handoff),
              (fiber) => Fi.join(fiber)
            )
          )
        )

        const updateLastChunk = (take: Take.Take<E1, P>): I.UIO<void> => Take.tap_(take, lastChunk.set)

        const handleTake = (take: Take.Take<E | E1, O>): Pull.Pull<R1, E | E1, Take.Take<E1, E.Either<never, P>>> =>
          pipe(
            take,
            Take.foldM(
              () =>
                pipe(
                  push(O.none()),
                  I.map((ps) => [Take.chunk(C.map_(ps, E.right)), Take.end])
                ),
              I.halt,
              (os) =>
                I.flatMap_(Take.fromPull(I.asSomeError(push(O.some(os)))), (take) =>
                  I.as_(updateLastChunk(take), () => [Take.map_(take, E.right)])
                )
            ),
            I.mapError(O.some)
          )

        const go = (race: boolean): I.IO<R & R1 & HasClock, O.Option<E | E1>, Chunk<Take.Take<E1, E.Either<Q, P>>>> => {
          if (!race) {
            return pipe(waitForProducer, I.flatMap(handleTake), I.apFirst(raceNextTime.set(true)))
          } else {
            return I.raceWith_(
              updateSchedule,
              waitForProducer,
              (scheduleDone, producerWaiting) =>
                pipe(
                  I.done(scheduleDone),
                  I.flatMap(
                    O.fold(
                      () =>
                        I.gen(function* (_) {
                          const lastQ = yield* _(
                            pipe(lastChunk.set(C.empty()), I.andThen(I.orDie(sdriver.last)), I.apFirst(sdriver.reset))
                          )

                          const scheduleResult: Take.Take<E1, E.Either<Q, P>> = Ex.succeed(C.single(E.left(lastQ)))

                          const take = yield* _(
                            pipe(push(O.none()), I.asSomeError, Take.fromPull, I.tap(updateLastChunk))
                          )
                          yield* _(raceNextTime.set(false))
                          yield* _(waitingFiber.set(O.some(producerWaiting)))
                          return [scheduleResult, Take.map_(take, E.right)]
                        }),
                      (_) =>
                        I.gen(function* (_) {
                          const ps = yield* _(
                            pipe(push(O.none()), I.asSomeError, Take.fromPull, I.tap(updateLastChunk))
                          )
                          yield* _(raceNextTime.set(false))
                          yield* _(waitingFiber.set(O.some(producerWaiting)))
                          return [Take.map_(ps, E.right)]
                        })
                    )
                  )
                ),
              (producerDone, scheduleWaiting) =>
                I.apSecond_(Fi.interrupt(scheduleWaiting), handleTake(Ex.flatten(producerDone)))
            )
          }
        }

        yield* _(I.forkManaged(producer))

        return pipe(
          raceNextTime.get,
          I.flatMap(go),
          I.onInterrupt((_) => pipe(waitingFiber.get, I.flatMap(flow(O.map(Fi.interrupt), O.getOrElse(I.unit)))))
        )
      })
    )
  )
}

/**
 * Uses `aggregateAsyncWithinEither` but only returns the `Right` results.
 */
export function aggregateAsyncWithin<O, R1, E1, P>(
  transducer: Transducer<R1, E1, O, P>,
  schedule: Schedule<R1, Chunk<P>, any>
): <R, E>(stream: Stream<R, E, O>) => Stream<R & R1 & HasClock, E | E1, P> {
  return (stream) => aggregateAsyncWithin_(stream, transducer, schedule)
}

/**
 * Uses `aggregateAsyncWithinEither` but only returns the `Right` results.
 */
export function aggregateAsyncWithin_<R, E, O, R1, E1, P>(
  stream: Stream<R, E, O>,
  transducer: Transducer<R1, E1, O, P>,
  schedule: Schedule<R1, Chunk<P>, any>
): Stream<R & R1 & HasClock, E | E1, P> {
  return filterMap_(
    aggregateAsyncWithinEither_(stream, transducer, schedule),
    E.fold(() => O.none(), O.some)
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
export function aggregateAsync<O, R1, E1, P>(
  transducer: Transducer<R1, E1, O, P>
): <R, E>(stream: Stream<R, E, O>) => Stream<R & R1 & HasClock, E | E1, P> {
  return (stream) => aggregateAsync_(stream, transducer)
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
export function aggregateAsync_<R, E, O, R1, E1, P>(
  stream: Stream<R, E, O>,
  transducer: Transducer<R1, E1, O, P>
): Stream<R & R1 & HasClock, E | E1, P> {
  return aggregateAsyncWithin_(stream, transducer, Sc.forever)
}

/**
 * Applies an aggregator to the stream, which converts one or more elements
 * of type `O` into elements of type `P`.
 */
export function aggregate_<R, E, O, R1, E1, P>(
  stream: Stream<R, E, O>,
  transducer: Transducer<R1, E1, O, P>
): Stream<R & R1, E | E1, P> {
  return new Stream(
    M.gen(function* (_) {
      const pull    = yield* _(stream.proc)
      const push    = yield* _(transducer.push)
      const doneRef = yield* _(Ref.make(false))

      const go: I.IO<R & R1, O.Option<E | E1>, Chunk<P>> = pipe(
        doneRef.get,
        I.flatMap((done) => {
          if (done) {
            return Pull.end
          } else {
            return pipe(
              pull,
              I.foldM(
                O.fold(
                  (): I.IO<R1, O.Option<E | E1>, Chunk<P>> =>
                    pipe(doneRef.set(true), I.andThen(I.asSomeError(push(O.none())))),
                  (e) => Pull.fail(e)
                ),
                (as) => I.asSomeError(push(O.some(as)))
              ),
              I.flatMap((ps) => (C.isEmpty(ps) ? go : I.succeed(ps)))
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
export function aggregate<R1, E1, O, P>(
  transducer: Transducer<R1, E1, O, P>
): <R, E>(stream: Stream<R, E, O>) => Stream<R & R1, E1 | E, P> {
  return (stream) => aggregate_(stream, transducer)
}

/**
 * More powerful version of `distributedWith`. This returns a function that will produce
 * new queues and corresponding indices.
 * You can also provide a function that will be executed after the final events are enqueued in all queues.
 * Shutdown of the queues is handled by the driver.
 * Downstream users can also shutdown queues manually. In this case the driver will
 * continue but no longer backpressure on them.
 */
export function distributedWithDynamic<E, O>(
  maximumLag: number,
  decide: (_: O) => I.UIO<(_: symbol) => boolean>,
  done: (_: Ex.Exit<O.Option<E>, never>) => I.UIO<any> = (_: any) => I.unit()
): <R>(
  stream: Stream<R, E, O>
) => M.Managed<R, never, I.UIO<readonly [symbol, Queue.Dequeue<Ex.Exit<O.Option<E>, O>>]>> {
  return (stream) => distributedWithDynamic_(stream, maximumLag, decide, done)
}

/**
 * More powerful version of `distributedWith`. This returns a function that will produce
 * new queues and corresponding indices.
 * You can also provide a function that will be executed after the final events are enqueued in all queues.
 * Shutdown of the queues is handled by the driver.
 * Downstream users can also shutdown queues manually. In this case the driver will
 * continue but no longer backpressure on them.
 */
export function distributedWithDynamic_<R, E, O>(
  stream: Stream<R, E, O>,
  maximumLag: number,
  decide: (o: O) => I.UIO<(_: symbol) => boolean>,
  done: (_: Ex.Exit<O.Option<E>, never>) => I.UIO<any> = (_: any) => I.unit()
): M.Managed<R, never, I.UIO<readonly [symbol, Queue.Dequeue<Ex.Exit<O.Option<E>, O>>]>> {
  const offer = (queuesRef: Ref.URef<ReadonlyMap<symbol, Queue.Queue<Ex.Exit<O.Option<E>, O>>>>) => (o: O) =>
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
          I.reduce(C.empty<symbol>(), (b, [id, queue]) => {
            if (shouldProcess(id)) {
              return pipe(
                queue.offer(Ex.succeed(o)),
                I.foldCauseM(
                  (c) => (Ca.interrupted(c) ? I.succeed(C.append(id)(b)) : I.halt(c)),
                  () => I.succeed(b)
                )
              )
            } else {
              return I.succeed(b)
            }
          }),
          I.flatMap((ids) => (C.isNonEmpty(ids) ? Ref.update_(queuesRef, Map.removeMany(ids)) : I.unit()))
        )
      )
    })

  return M.gen(function* (_) {
    const queuesRef = yield* _(
      pipe(
        Ref.make(Map.empty<symbol, Queue.Queue<Ex.Exit<O.Option<E>, O>>>()),
        M.make((_) => I.flatMap_(_.get, (qs) => I.foreach_(qs.values(), (q) => q.shutdown)))
      )
    )
    const add       = yield* _(
      M.gen(function* (_) {
        const queuesLock = yield* _(Semaphore.make(1))
        const newQueue   = yield* _(
          Ref.make<I.UIO<readonly [symbol, Queue.Queue<Ex.Exit<O.Option<E>, O>>]>>(
            I.gen(function* (_) {
              const queue = yield* _(Queue.makeBounded<Ex.Exit<O.Option<E>, O>>(maximumLag))
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
                const queue = yield* _(Queue.makeBounded<Ex.Exit<O.Option<E>, O>>(1))
                yield* _(queue.offer(endTake))
                const id = Symbol() as symbol
                yield* _(pipe(queuesRef, Ref.update(Map.insert(id, queue))))
                return tuple(id, queue)
              }),
              newQueue.set,
              I.flatMap(() =>
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
                        I.catchSomeCause((c) => (Ca.interrupted(c) ? O.some(I.unit()) : O.none<I.UIO<void>>()))
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
            stream,
            foreachManaged(offer(queuesRef)),
            M.foldCauseM(flow(Ca.map(O.some), Ex.failure, finalize, I.toManaged()), () =>
              pipe(O.none(), Ex.fail, finalize, I.toManaged())
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
export function distributedWith<O>(
  n: number,
  maximumLag: number,
  decide: (_: O) => I.UIO<(_: number) => boolean>
): <R, E>(stream: Stream<R, E, O>) => M.Managed<R, never, Chunk<Queue.Dequeue<Ex.Exit<O.Option<E>, O>>>> {
  return (stream) => distributedWith_(stream, n, maximumLag, decide)
}

/**
 * More powerful version of `broadcast`. Allows to provide a function that determines what
 * queues should receive which elements. The decide function will receive the indices of the queues
 * in the resulting list.
 */
export function distributedWith_<R, E, O>(
  stream: Stream<R, E, O>,
  n: number,
  maximumLag: number,
  decide: (_: O) => I.UIO<(_: number) => boolean>
): M.Managed<R, never, Chunk<Queue.Dequeue<Ex.Exit<O.Option<E>, O>>>> {
  return pipe(
    P.make<never, (_: O) => I.UIO<(_: symbol) => boolean>>(),
    M.fromEffect,
    M.flatMap((prom) =>
      pipe(
        distributedWithDynamic_(
          stream,
          maximumLag,
          (o) => I.flatMap_(prom.await, (_) => _(o)),
          (_) => I.unit()
        ),
        M.flatMap((next) =>
          pipe(
            I.collectAll(
              pipe(
                C.range(0, n),
                C.map((id) => I.map_(next, ([key, queue]) => [[key, id], queue] as const))
              )
            ),
            I.flatMap((entries) => {
              const [mappings, queues] = C.foldRight_(
                entries,
                [Map.empty<symbol, number>(), C.empty<Queue.Dequeue<Ex.Exit<O.Option<E>, O>>>()] as const,
                ([mapping, queue], [mappings, queues]) => [
                  Map.insert_(mappings, mapping[0], mapping[1]),
                  C.append_(queues, queue)
                ]
              )
              return pipe(
                prom.succeed((o: O) => I.map_(decide(o), (f) => (key: symbol) => f(mappings.get(key) as number))),
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
): <R, E, O>(stream: Stream<R, E, O>) => M.Managed<R, never, Chunk<Queue.Dequeue<Ex.Exit<O.Option<E>, O>>>> {
  return (stream) => broadcastedQueues_(stream, n, maximumLag)
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
export function broadcastedQueues_<R, E, O>(
  stream: Stream<R, E, O>,
  n: number,
  maximumLag: number
): M.Managed<R, never, Chunk<Queue.Dequeue<Ex.Exit<O.Option<E>, O>>>> {
  const decider = I.succeed((_: number) => true)
  return distributedWith_(stream, n, maximumLag, (_) => decider)
}

/**
 * Fan out the stream, producing a list of streams that have the same elements as this stream.
 * The driver stream will only ever advance of the `maximumLag` chunks before the
 * slowest downstream stream.
 */
export function broadcast(
  n: number,
  maximumLag: number
): <R, E, O>(stream: Stream<R, E, O>) => M.Managed<R, never, Chunk<Stream<unknown, E, O>>> {
  return (stream) => broadcast_(stream, n, maximumLag)
}

/**
 * Fan out the stream, producing a list of streams that have the same elements as this stream.
 * The driver stream will only ever advance of the `maximumLag` chunks before the
 * slowest downstream stream.
 */
export function broadcast_<R, E, O>(
  stream: Stream<R, E, O>,
  n: number,
  maximumLag: number
): M.Managed<R, never, Chunk<Stream<unknown, E, O>>> {
  return pipe(
    broadcastedQueues_(stream, n, maximumLag),
    M.map(C.map((q) => flattenExitOption(fromQueueWithShutdown(q))))
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
export function broadcastedQueuesDynamic_<R, E, O>(
  stream: Stream<R, E, O>,
  maximumLag: number
): M.Managed<R, never, I.UIO<Queue.Dequeue<Ex.Exit<O.Option<E>, O>>>> {
  return M.map_(
    distributedWithDynamic_(
      stream,
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
): <R, E, O>(stream: Stream<R, E, O>) => M.Managed<R, never, I.UIO<Queue.Dequeue<Ex.Exit<O.Option<E>, O>>>> {
  return (ma) => broadcastedQueuesDynamic_(ma, maximumLag)
}

export function broadcastDynamic_<R, E, O>(
  stream: Stream<R, E, O>,
  maximumLag: number
): M.Managed<R, never, I.UIO<Stream<unknown, E, O>>> {
  return pipe(
    distributedWithDynamic_(
      stream,
      maximumLag,
      (_) => I.succeed(constTrue),
      (_) => I.unit()
    ),
    M.map(I.map(([, queue]) => queue)),
    M.map(I.map(flow(fromQueueWithShutdown, flattenExitOption)))
  )
}

export function broadcastDynamic(
  maximumLag: number
): <R, E, O>(stream: Stream<R, E, O>) => M.Managed<R, never, I.UIO<Stream<unknown, E, O>>> {
  return (stream) => broadcastDynamic_(stream, maximumLag)
}

/**
 * Allows a faster producer to progress independently of a slower consumer by buffering
 * up to `capacity` chunks in a queue.
 *
 * @note Prefer capacities that are powers of 2 for better performance.
 */
export function buffer_<R, E, O>(ma: Stream<R, E, O>, capacity: number): Stream<R, E, O> {
  return new Stream(
    M.gen(function* (_) {
      const doneRef = yield* _(Ref.make(false))
      const queue   = yield* _(toQueue_(ma, capacity))
      return pipe(
        doneRef.get,
        I.flatMap((done) => {
          if (done) {
            return Pull.end
          } else {
            return pipe(
              queue.take,
              I.flatMap(I.done),
              I.catchSome(
                O.fold(() => pipe(doneRef.set(true), I.andThen(Pull.end), O.some), flow(O.some, I.fail, O.some))
              )
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
export function buffer(capacity: number): <R, E, O>(ma: Stream<R, E, O>) => Stream<R, E, O> {
  return (ma) => buffer_(ma, capacity)
}

/**
 * Allows a faster producer to progress independently of a slower consumer by buffering
 * elements into an unbounded queue.
 */
export function bufferUnbounded<R, E, O>(ma: Stream<R, E, O>): Stream<R, E, O> {
  return new Stream(
    M.gen(function* (_) {
      const doneRef = yield* _(Ref.makeManaged(false))
      const queue   = yield* _(toQueueUnbounded(ma))
      return pipe(
        doneRef.get,
        I.flatMap((done) => {
          if (done) {
            return Pull.end
          } else {
            return pipe(
              queue.take,
              I.flatMap(Take.foldM(() => pipe(doneRef.set(true), I.andThen(Pull.end)), Pull.halt, Pull.emitChunk))
            )
          }
        })
      )
    })
  )
}

function bufferSignal_<R, E, O>(
  ma: Stream<R, E, O>,
  queue: Queue.Queue<[Take.Take<E, O>, P.Promise<never, void>]>
): M.Managed<R, never, I.IO<R, O.Option<E>, Chunk<O>>> {
  return M.gen(function* (_) {
    const as    = yield* _(ma.proc)
    const start = yield* _(P.make<never, void>())
    yield* _(start.succeed(undefined))
    const ref     = yield* _(Ref.make(start))
    const doneRef = yield* _(Ref.make(false))
    const offer   = (take: Take.Take<E, O>): I.UIO<void> =>
      Ex.fold_(
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
      I.flatMap((done) => {
        if (done) {
          return Pull.end
        } else {
          return pipe(
            queue.take,
            I.flatMap(([take, p]) =>
              pipe(
                p.succeed(undefined),
                I.andThen(I.when(() => take === Take.end)(doneRef.set(true))),
                I.andThen(Take.done(take))
              )
            )
          )
        }
      })
    )
  })
}

export function bufferSliding_<R, E, O>(ma: Stream<R, E, O>, capacity = 2): Stream<R, E, O> {
  return new Stream(
    M.gen(function* (_) {
      const queue = yield* _(
        I.toManaged_(Queue.makeSliding<[Take.Take<E, O>, P.Promise<never, void>]>(capacity), (q) => q.shutdown)
      )
      return yield* _(bufferSignal_(ma, queue))
    })
  )
}

export function bufferSliding(capacity = 2): <R, E, O>(ma: Stream<R, E, O>) => Stream<R, E, O> {
  return (ma) => bufferSliding_(ma, capacity)
}

export function bufferDropping_<R, E, O>(ma: Stream<R, E, O>, capacity = 2): Stream<R, E, O> {
  return new Stream(
    M.gen(function* (_) {
      const queue = yield* _(
        I.toManaged_(Queue.makeDropping<[Take.Take<E, O>, P.Promise<never, void>]>(capacity), (q) => q.shutdown)
      )
      return yield* _(bufferSignal_(ma, queue))
    })
  )
}

export function bufferDropping(capacity = 2): <R, E, O>(ma: Stream<R, E, O>) => Stream<R, E, O> {
  return (ma) => bufferSliding_(ma, capacity)
}

export function toQueue_<R, E, O>(
  ma: Stream<R, E, O>,
  capacity = 2
): M.Managed<R, never, Queue.Dequeue<Take.Take<E, O>>> {
  return M.gen(function* (_) {
    const queue = yield* _(I.toManaged_(Queue.makeBounded<Take.Take<E, O>>(capacity), (q) => q.shutdown))
    yield* _(M.fork(intoManaged_(ma, queue)))
    return queue
  })
}

/**
 * Switches over to the stream produced by the provided function in case this one
 * fails. Allows recovery from all causes of failure, including interruption if the
 * stream is uninterruptible.
 */
export function catchAllCause_<R, E, A, R1, E2, B>(
  stream: Stream<R, E, A>,
  f: (e: Ca.Cause<E>) => Stream<R1, E2, B>
): Stream<R & R1, E2, B | A> {
  type NotStarted = { _tag: 'NotStarted' }
  type Self<E0> = { _tag: 'Self', pull: Pull.Pull<R, E0, A> }
  type Other = { _tag: 'Other', pull: Pull.Pull<R1, E2, B> }
  type State<E0> = NotStarted | Self<E0> | Other
  return new Stream<R & R1, E2, A | B>(
    M.gen(function* (_) {
      const finalizerRef = yield* _(M.finalizerRef(RM.noopFinalizer))
      const stateRef     = yield* _(
        Ref.make<State<E>>({ _tag: 'NotStarted' })
      )

      const closeCurrent = (cause: Ca.Cause<any>) =>
        pipe(
          finalizerRef,
          Ref.getAndSet(RM.noopFinalizer),
          I.flatMap((f) => f(Ex.failure(cause))),
          I.makeUninterruptible
        )

      const open = <R, E0, O>(stream: Stream<R, E0, O>) => (asState: (_: Pull.Pull<R, E0, O>) => State<E>) =>
        I.uninterruptibleMask(({ restore }) =>
          pipe(
            RM.make,
            I.flatMap((releaseMap) =>
              pipe(
                finalizerRef.set((exit) => M.releaseAll(exit, sequential)(releaseMap)),
                I.flatMap(() =>
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
          O.fold(
            () => I.fail(O.none()),
            (cause) =>
              pipe(
                closeCurrent(cause),
                I.flatMap(() =>
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
        I.flatMap((s) => {
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

export function catchAllCause<E, R1, E1, B>(
  f: (e: Ca.Cause<E>) => Stream<R1, E1, B>
): <R, A>(stream: Stream<R, E, A>) => Stream<R & R1, E1, B | A> {
  return (stream) => catchAllCause_(stream, f)
}

/**
 * Switches over to the stream produced by the provided function in case this one
 * fails with a typed error.
 */
export function catchAll_<R, E, O, R1, E1, O1>(
  ma: Stream<R, E, O>,
  f: (e: E) => Stream<R1, E1, O1>
): Stream<R & R1, E1, O | O1> {
  return catchAllCause_(ma, flow(Ca.failureOrCause, E.fold(f, halt)))
}

/**
 * Switches over to the stream produced by the provided function in case this one
 * fails with a typed error.
 */
export function catchAll<E, R1, E1, O1>(
  f: (e: E) => Stream<R1, E1, O1>
): <R, O>(ma: Stream<R, E, O>) => Stream<R & R1, E1, O | O1> {
  return (ma) => catchAll_(ma, f)
}

/**
 * Switches over to the stream produced by the provided function in case this one
 * fails with some typed error.
 */
export function catchSome_<R, E, O, R1, E1, O1>(
  ma: Stream<R, E, O>,
  f: (e: E) => Option<Stream<R1, E1, O1>>
): Stream<R & R1, E | E1, O | O1> {
  return catchAll_(ma, (e) => O.fold_(f(e), (): Stream<R & R1, E | E1, O | O1> => fail(e), identity))
}

/**
 * Switches over to the stream produced by the provided function in case this one
 * fails with some typed error.
 */
export function catchSome<E, R1, E1, O1>(
  f: (e: E) => Option<Stream<R1, E1, O1>>
): <R, O>(ma: Stream<R, E, O>) => Stream<R & R1, E | E1, O | O1> {
  return (ma) => catchSome_(ma, f)
}

/**
 * Switches over to the stream produced by the provided function in case this one
 * fails with some errors. Allows recovery from all causes of failure, including interruption if the
 * stream is uninterruptible.
 */
export function catchSomeCause_<R, E, O, R1, E1, O1>(
  ma: Stream<R, E, O>,
  f: (cause: Ca.Cause<E>) => Option<Stream<R1, E1, O1>>
): Stream<R & R1, E | E1, O | O1> {
  return catchAllCause_(ma, (cause) => O.fold_(f(cause), (): Stream<R & R1, E | E1, O | O1> => halt(cause), identity))
}

/**
 * Switches over to the stream produced by the provided function in case this one
 * fails with some errors. Allows recovery from all causes of failure, including interruption if the
 * stream is uninterruptible.
 */
export function catchSomeCause<E, R1, E1, O1>(
  f: (cause: Ca.Cause<E>) => Option<Stream<R1, E1, O1>>
): <R, O>(ma: Stream<R, E, O>) => Stream<R & R1, E | E1, O | O1> {
  return (ma) => catchSomeCause_(ma, f)
}

export function flatMapPar_<R, E, O, R1, E1, O1>(
  ma: Stream<R, E, O>,
  f: (o: O) => Stream<R1, E1, O1>,
  n: number,
  outputBuffer = 16
) {
  return new Stream(
    M.withChildren((getChildren) =>
      M.gen(function* (_) {
        const outQueue     = yield* _(
          I.toManaged_(Queue.makeBounded<I.IO<R1, O.Option<E | E1>, Chunk<O1>>>(outputBuffer), (q) => q.shutdown)
        )
        const permits      = yield* _(Semaphore.make(n))
        const innerFailure = yield* _(P.make<Ca.Cause<E1>, never>())
        yield* _(
          pipe(
            foreachManaged_(ma, (o) =>
              I.gen(function* (_) {
                const latch       = yield* _(P.make<never, void>())
                const innerStream = pipe(
                  Semaphore.withPermitManaged(permits),
                  managed,
                  tap(() => latch.succeed(undefined)),
                  flatMap(() => f(o)),
                  foreachChunk(flow(I.succeed, outQueue.offer, I.asUnit)),
                  I.foldCauseM(
                    (cause) =>
                      pipe(cause, Pull.halt, outQueue.offer, I.andThen(innerFailure.fail(cause)), I.asUnit),
                    () => I.unit()
                  )
                )
                yield* _(I.fork(innerStream))
                yield* _(latch.await)
              })
            ),
            M.foldCauseM(
              (cause) =>
                pipe(
                  getChildren,
                  I.flatMap(Fi.interruptAll),
                  I.andThen(I.asUnit(outQueue.offer(Pull.halt(cause)))),
                  I.toManaged()
                ),
              () =>
                pipe(
                  innerFailure.await,
                  I.makeInterruptible,
                  I.raceWith(
                    Semaphore.withPermits(n, permits)(I.makeInterruptible(I.unit())),
                    (_, permitsAcquisition) =>
                      pipe(
                        getChildren,
                        I.flatMap(Fi.interruptAll),
                        I.andThen(I.asUnit(Fi.interrupt(permitsAcquisition)))
                      ),
                    (_, failureAwait) => pipe(outQueue.offer(Pull.end), I.andThen(I.asUnit(Fi.interrupt(failureAwait))))
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

export function flatMapPar<O, R1, E1, O1>(
  f: (o: O) => Stream<R1, E1, O1>,
  n: number,
  outputBuffer = 16
): <R, E>(stream: Stream<R, E, O>) => Stream<R & R1, E | E1, O1> {
  return (stream) => flatMapPar_(stream, f, n, outputBuffer)
}

/**
 * Maps each element of this stream to another stream and returns the non-deterministic merge
 * of those streams, executing up to `n` inner streams concurrently. When a new stream is created
 * from an element of the source stream, the oldest executing stream is cancelled. Up to `bufferSize`
 * elements of the produced streams may be buffered in memory by this operator.
 */
export function chainParSwitch_(n: number, bufferSize = 16) {
  return <R, E, O, R1, E1, O2>(ma: Stream<R, E, O>, f: (o: O) => Stream<R1, E1, O2>): Stream<R & R1, E | E1, O2> => {
    return new Stream(
      M.withChildren((getChildren) =>
        M.gen(function* (_) {
          const outQueue     = yield* _(
            I.toManaged_(Queue.makeBounded<I.IO<R1, O.Option<E | E1>, C.Chunk<O2>>>(bufferSize), (q) => q.shutdown)
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
                        I.flatMap(() => I.succeed(undefined)),
                        I.asUnit
                      )
                    )
                  }
                  yield* _(cancelers.offer(canceler))
                  const innerStream = pipe(
                    Semaphore.withPermitManaged(permits),
                    managed,
                    tap(() => latch.succeed(undefined)),
                    flatMap(() => f(o)),
                    foreachChunk(flow(I.succeed, outQueue.offer, I.asUnit)),
                    I.foldCauseM(
                      (cause) =>
                        pipe(cause, Pull.halt, outQueue.offer, I.andThen(innerFailure.fail(cause)), I.asUnit),
                      () => I.unit()
                    )
                  )
                  yield* _(I.fork(I.race_(innerStream, canceler.await)))
                  yield* _(latch.await)
                })
              ),
              M.foldCauseM(
                (cause) =>
                  pipe(
                    getChildren,
                    I.flatMap(Fi.interruptAll),
                    I.andThen(outQueue.offer(Pull.halt(cause))),
                    I.toManaged()
                  ),
                () =>
                  pipe(
                    innerFailure.await,
                    I.raceWith(
                      Semaphore.withPermits(n, permits)(I.unit()),
                      (_, permitsAcquisition) =>
                        pipe(
                          getChildren,
                          I.flatMap(Fi.interruptAll),
                          I.andThen(I.asUnit(Fi.interrupt(permitsAcquisition)))
                        ),
                      (_, failureAwait) =>
                        pipe(outQueue.offer(Pull.end), I.andThen(I.asUnit(Fi.interrupt(failureAwait))))
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
export function chainParSwitch(n: number, bufferSize = 16) {
  return <O, R1, E1, O2>(f: (o: O) => Stream<R1, E1, O2>) => <R, E>(ma: Stream<R, E, O>): Stream<R & R1, E | E1, O2> =>
    chainParSwitch_(n, bufferSize)(ma, f)
}

/**
 * Re-chunks the elements of the stream into chunks of `n` elements each.
 * The last chunk might contain less than `n` elements
 */
export function chunkN_<R, E, O>(ma: Stream<R, E, O>, n: number): Stream<R, E, O> {
  interface State<X> {
    readonly buffer: Chunk<X>
    readonly done: boolean
  }

  function emitOrAccumulate(
    buffer: Chunk<O>,
    done: boolean,
    ref: Ref.URef<State<O>>,
    pull: I.IO<R, Option<E>, Chunk<O>>
  ): I.IO<R, Option<E>, Chunk<O>> {
    if (buffer.length < n) {
      if (done) {
        if (C.isEmpty(buffer)) {
          return Pull.end
        } else {
          return I.andThen_(
            ref.set({
              buffer: C.empty(),
              done: true
            }),
            Pull.emitChunk(buffer)
          )
        }
      } else {
        return I.foldM_(
          pull,
          O.fold(() => emitOrAccumulate(buffer, true, ref, pull), Pull.fail),
          (ch) => emitOrAccumulate(C.concat_(buffer, ch), false, ref, pull)
        )
      }
    } else {
      const [chunk, leftover] = C.splitAt_(buffer, n)
      return I.andThen_(ref.set({ buffer: leftover, done }), Pull.emitChunk(chunk))
    }
  }

  if (n < 1) {
    return halt(Ca.die(new Error('chunkN: n must be at least 1')))
  } else {
    return new Stream(
      M.gen(function* (_) {
        const ref = yield* _(
          Ref.make<State<O>>({ buffer: C.empty(), done: false })
        )
        const p   = yield* _(ma.proc)
        return I.flatMap_(ref.get, (s) => emitOrAccumulate(s.buffer, s.done, ref, p))
      })
    )
  }
}

/**
 * Re-chunks the elements of the stream into chunks of `n` elements each.
 * The last chunk might contain less than `n` elements
 */
export function chunkN(n: number): <R, E, O>(ma: Stream<R, E, O>) => Stream<R, E, O> {
  return (ma) => chunkN_(ma, n)
}

export function collectLeft<R, E, L, O>(ma: Stream<R, E, E.Either<L, O>>): Stream<R, E, L> {
  return filterMap_(ma, O.getLeft)
}

export function collectRight<R, E, L, O>(ma: Stream<R, E, E.Either<L, O>>): Stream<R, E, O> {
  return filterMap_(ma, O.getRight)
}

export function collectSome<R, E, O>(ma: Stream<R, E, O.Option<O>>): Stream<R, E, O> {
  return filterMap_(ma, identity)
}

export function collectSuccess<R, E, L, O>(ma: Stream<R, E, Ex.Exit<L, O>>): Stream<R, E, O> {
  return filterMap_(ma, (ex) => (Ex.isSuccess(ex) ? O.some(ex.value) : O.none()))
}

export function collectWhile_<R, E, O, O1>(ma: Stream<R, E, O>, f: (o: O) => O.Option<O1>): Stream<R, E, O1> {
  return new Stream(
    M.gen(function* (_) {
      const chunks  = yield* _(ma.proc)
      const doneRef = yield* _(Ref.makeManaged(false))
      return pipe(
        doneRef.get,
        I.flatMap((done) => {
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

export function collectWhile<O, O1>(f: (o: O) => O.Option<O1>): <R, E>(ma: Stream<R, E, O>) => Stream<R, E, O1> {
  return (ma) => collectWhile_(ma, f)
}

export function collectWhileLeft<R, E, L, O>(ma: Stream<R, E, E.Either<L, O>>): Stream<R, E, L> {
  return collectWhile_(ma, O.getLeft)
}

export function collectWhileRight<R, E, L, O>(ma: Stream<R, E, E.Either<L, O>>): Stream<R, E, O> {
  return collectWhile_(ma, O.getRight)
}

export function collectWhileSome<R, E, O>(ma: Stream<R, E, O.Option<O>>): Stream<R, E, O> {
  return collectWhile_(ma, identity)
}

export function collectWhileSuccess<R, E, L, O>(ma: Stream<R, E, Ex.Exit<L, O>>): Stream<R, E, O> {
  return collectWhile_(ma, (ex) => (Ex.isSuccess(ex) ? O.some(ex.value) : O.none()))
}

export function collectWhileM_<R, E, O, R1, E1, O1>(
  ma: Stream<R, E, O>,
  f: (o: O) => O.Option<I.IO<R1, E1, O1>>
): Stream<R & R1, E | E1, O1> {
  return new Stream(
    M.gen(function* (_) {
      const os      = yield* _(M.mapM_(ma.proc, BPull.make))
      const doneRef = yield* _(Ref.makeManaged(false))
      return pipe(
        doneRef.get,
        I.flatMap((done) => {
          if (done) {
            return Pull.end
          } else {
            return pipe(
              BPull.pullElement(os),
              I.flatMap(
                flow(
                  f,
                  O.fold(() => pipe(doneRef.set(true), I.andThen(Pull.end)), I.bimap(O.some, C.single))
                )
              )
            ) as I.IO<R & R1, O.Option<E | E1>, Chunk<O1>>
          }
        })
      )
    })
  )
}

export function collectWhileM<O, R1, E1, O1>(
  f: (o: O) => O.Option<I.IO<R1, E1, O1>>
): <R, E>(ma: Stream<R, E, O>) => Stream<R & R1, E | E1, O1> {
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
export function combine_<R, E, O, R1, E1, O1, Z, C>(
  stream: Stream<R, E, O>,
  that: Stream<R1, E1, O1>,
  z: Z,
  f: (
    z: Z,
    s: I.IO<R, Option<E>, O>,
    t: I.IO<R1, Option<E1>, O1>
  ) => I.IO<R & R1, never, Ex.Exit<Option<E | E1>, readonly [C, Z]>>
): Stream<R & R1, E | E1, C> {
  return new Stream(
    M.gen(function* (_) {
      const left  = yield* _(M.mapM_(stream.proc, BPull.make))
      const right = yield* _(M.mapM_(that.proc, BPull.make))
      const pull  = yield* _(
        unfoldM(z, (z) => I.flatMap_(f(z, BPull.pullElement(left), BPull.pullElement(right)), flow(I.done, I.optional)))
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
export function combine<R, E, O, R1, E1, O1, Z, C>(
  that: Stream<R1, E1, O1>,
  z: Z,
  f: (
    z: Z,
    s: I.IO<R, Option<E>, O>,
    t: I.IO<R1, Option<E1>, O1>
  ) => I.IO<R & R1, never, Ex.Exit<Option<E | E1>, readonly [C, Z]>>
): (stream: Stream<R, E, O>) => Stream<R & R1, E | E1, C> {
  return (stream) => combine_(stream, that, z, f)
}

/**
 * Combines the chunks from this stream and the specified stream by repeatedly applying the
 * function `f` to extract a chunk using both sides and conceptually "offer"
 * it to the destination stream. `f` can maintain some internal state to control
 * the combining process, with the initial state being specified by `s`.
 */
export function combineChunks_<R, E, O, R1, E1, O1, Z, C>(
  stream: Stream<R, E, O>,
  that: Stream<R1, E1, O1>,
  z: Z,
  f: (
    z: Z,
    s: I.IO<R, Option<E>, Chunk<O>>,
    t: I.IO<R1, Option<E1>, Chunk<O1>>
  ) => I.IO<R & R1, never, Ex.Exit<Option<E | E1>, readonly [Chunk<C>, Z]>>
): Stream<R & R1, E | E1, C> {
  return new Stream(
    pipe(
      M.do,
      M.bindS('left', () => stream.proc),
      M.bindS('right', () => that.proc),
      M.bindS(
        'pull',
        ({ left, right }) =>
          unfoldChunkM(z, (z) =>
            pipe(
              f(z, left, right),
              I.flatMap((ex) => I.optional(I.done(ex)))
            )
          ).proc
      ),
      M.map(({ pull }) => pull)
    )
  )
}

/**
 * Combines the chunks from this stream and the specified stream by repeatedly applying the
 * function `f` to extract a chunk using both sides and conceptually "offer"
 * it to the destination stream. `f` can maintain some internal state to control
 * the combining process, with the initial state being specified by `s`.
 */
export function combineChunks<R, E, O, R1, E1, O1, Z, C>(
  that: Stream<R1, E1, O1>,
  z: Z,
  f: (
    z: Z,
    s: I.IO<R, Option<E>, Chunk<O>>,
    t: I.IO<R1, Option<E1>, Chunk<O1>>
  ) => I.IO<R & R1, never, Ex.Exit<Option<E | E1>, readonly [Chunk<C>, Z]>>
): (stream: Stream<R, E, O>) => Stream<R & R1, E | E1, C> {
  return (stream) => combineChunks_(stream, that, z, f)
}

export function concat_<R, E, A, R1, E1, B>(ma: Stream<R, E, A>, mb: Stream<R1, E1, B>): Stream<R & R1, E | E1, A | B> {
  return new Stream(
    M.gen(function* (_) {
      const currStream   = yield* _(Ref.make<I.IO<R & R1, O.Option<E | E1>, C.Chunk<A | B>>>(Pull.end))
      const switchStream = yield* _(M.switchable<R & R1, never, I.IO<R & R1, O.Option<E | E1>, C.Chunk<A | B>>>())
      const switched     = yield* _(Ref.make(false))
      yield* _(
        pipe(
          ma.proc,
          switchStream,
          I.flatMap((x) => currStream.set(x))
        )
      )

      const go: I.IO<R & R1, O.Option<E | E1>, C.Chunk<A | B>> = pipe(
        currStream.get,
        (x) => I.flatten(x),
        I.catchAllCause(
          flow(
            Ca.sequenceCauseOption,
            O.fold(
              () =>
                pipe(
                  switched,
                  Ref.getAndSet(true),
                  I.flatMap((b) =>
                    b ? Pull.end : pipe(switchStream(mb.proc), I.flatMap(currStream.set), I.andThen(go))
                  )
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
            O.fold(
              () =>
                pipe(
                  currIndex,
                  Ref.getAndUpdate((x) => x + 1),
                  I.flatMap((i) => {
                    if (i >= chunkSize) {
                      return Pull.end
                    } else {
                      return pipe(switchStream(streams[i].proc), I.flatMap(currStream.set), I.andThen(go))
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
export function crossWith_<R, E, O, R1, E1, O1, C>(
  stream: Stream<R, E, O>,
  that: Stream<R1, E1, O1>,
  f: (o: O, o1: O1) => C
): Stream<R & R1, E | E1, C> {
  return flatMap_(stream, (o) => map_(that, (o1) => f(o, o1)))
}

/**
 * Composes this stream with the specified stream to create a cartesian product of elements
 * with a specified function.
 * The `that` stream would be run multiple times, for every element in the `this` stream.
 *
 * See also `zipWith` for the more common point-wise variant.
 */
export function crossWith<O, R1, E1, O1, C>(
  that: Stream<R1, E1, O1>,
  f: (o: O, o1: O1) => C
): <R, E>(stream: Stream<R, E, O>) => Stream<R & R1, E | E1, C> {
  return (stream) => crossWith_(stream, that, f)
}

/**
 * Composes this stream with the specified stream to create a cartesian product of elements.
 * The `that` stream would be run multiple times, for every element in the `this` stream.
 *
 * See also `zip` and for the more common point-wise variant.
 */
export function cross_<R, E, O, R1, E1, O1>(
  stream: Stream<R, E, O>,
  that: Stream<R1, E1, O1>
): Stream<R & R1, E | E1, readonly [O, O1]> {
  return crossWith_(stream, that, tuple)
}

/**
 * Composes this stream with the specified stream to create a cartesian product of elements.
 * The `that` stream would be run multiple times, for every element in the `this` stream.
 *
 * See also `zip` and for the more common point-wise variant.
 */
export function cross<R1, E1, O1>(
  that: Stream<R1, E1, O1>
): <R, E, O>(stream: Stream<R, E, O>) => Stream<R & R1, E | E1, readonly [O, O1]> {
  return (stream) => cross_(stream, that)
}

/**
 * Composes this stream with the specified stream to create a cartesian product of elements,
 * but keeps only elements from this stream.
 * The `that` stream would be run multiple times, for every element in the `this` stream.
 *
 * See also `apFirst` for the more common point-wise variant.
 */
export function crossFirst_<R, E, O, R1, E1, O1>(
  stream: Stream<R, E, O>,
  that: Stream<R1, E1, O1>
): Stream<R & R1, E | E1, O> {
  return crossWith_(stream, that, (o, _) => o)
}

/**
 * Composes this stream with the specified stream to create a cartesian product of elements,
 * but keeps only elements from this stream.
 * The `that` stream would be run multiple times, for every element in the `this` stream.
 *
 * See also `apFirst` for the more common point-wise variant.
 */
export function crossFirst<R1, E1, O1>(
  that: Stream<R1, E1, O1>
): <R, E, O>(stream: Stream<R, E, O>) => Stream<R & R1, E | E1, O> {
  return (stream) => crossFirst_(stream, that)
}

/**
 * Composes this stream with the specified stream to create a cartesian product of elements,
 * but keeps only elements from the other stream.
 * The `that` stream would be run multiple times, for every element in the `this` stream.
 *
 * See also `apSecond` for the more common point-wise variant.
 */
export function crossSecond_<R, E, O, R1, E1, O1>(
  stream: Stream<R, E, O>,
  that: Stream<R1, E1, O1>
): Stream<R & R1, E | E1, O1> {
  return crossWith_(stream, that, (_, o1) => o1)
}

/**
 * Composes this stream with the specified stream to create a cartesian product of elements,
 * but keeps only elements from the other stream.
 * The `that` stream would be run multiple times, for every element in the `this` stream.
 *
 * See also `apSecond` for the more common point-wise variant.
 */
export function crossSecond<R1, E1, O1>(
  that: Stream<R1, E1, O1>
): <R, E, O>(stream: Stream<R, E, O>) => Stream<R & R1, E | E1, O1> {
  return (stream) => crossSecond_(stream, that)
}

/**
 * Drops the specified number of elements from this stream.
 */
export function drop_<R, E, O>(self: Stream<R, E, O>, n: number): Stream<R, E, O> {
  return new Stream(
    M.gen(function* (_) {
      const chunks     = yield* _(self.proc)
      const counterRef = yield* _(Ref.make(0))

      const pull: I.IO<R, O.Option<E>, Chunk<O>> = I.gen(function* (_) {
        const chunk = yield* _(chunks)
        const count = yield* _(counterRef.get)
        if (count >= n) {
          return yield* _(I.succeed(chunk))
        } else if (chunk.length <= n - count) {
          return yield* _(pipe(counterRef.set(count + chunk.length), I.andThen(pull)))
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
  return <R, E, O>(self: Stream<R, E, O>) => drop_(self, n)
}

/**
 * Drops all elements of the stream until the specified predicate evaluates
 * to `true`.
 */
export function dropUntil_<R, E, O>(ma: Stream<R, E, O>, p: Predicate<O>): Stream<R, E, O> {
  return drop_(dropWhile_(ma, not(p)), 1)
}

/**
 * Drops all elements of the stream until the specified predicate evaluates
 * to `true`.
 */
export function dropUntil<O>(p: Predicate<O>): <R, E>(ma: Stream<R, E, O>) => Stream<R, E, O> {
  return (ma) => dropUntil_(ma, p)
}

/**
 * Drops all elements of the stream for as long as the specified predicate
 * evaluates to `true`.
 */
export function dropWhile_<R, E, O>(ma: Stream<R, E, O>, pred: Predicate<O>): Stream<R, E, O> {
  return new Stream(
    M.gen(function* (_) {
      const chunks          = yield* _(ma.proc)
      const keepDroppingRef = yield* _(Ref.make(true))

      const pull: I.IO<R, O.Option<E>, Chunk<O>> = I.gen(function* (_) {
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
export function dropWhile<O>(pred: Predicate<O>) {
  return <R, E>(ma: Stream<R, E, O>) => dropWhile_(ma, pred)
}

/**
 * Executes the provided finalizer after this stream's finalizers run.
 */
export function ensuring_<R, E, O, R1>(ma: Stream<R, E, O>, finalizer: I.IO<R1, never, any>): Stream<R & R1, E, O> {
  return new Stream(M.ensuring_(ma.proc, finalizer))
}

/**
 * Executes the provided finalizer after this stream's finalizers run.
 */
export function ensuring<R1>(finalizer: I.IO<R1, never, any>): <R, E, O>(ma: Stream<R, E, O>) => Stream<R & R1, E, O> {
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
export function fixed_<R, E, O>(ma: Stream<R, E, O>, duration: number): Stream<R & Has<Clock>, E, O> {
  return schedule_(ma, Sc.fixed(duration))
}

/**
 * Emits elements of this stream with a fixed delay in between, regardless of how long it
 * takes to produce a value.
 */
export function fixed(duration: number) {
  return <R, E, O>(self: Stream<R, E, O>) => fixed_(self, duration)
}

export function groupBy_<R, E, O, R1, E1, K, V>(
  stream: Stream<R, E, O>,
  f: (o: O) => I.IO<R1, E1, readonly [K, V]>,
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
                I.flatMap((f) => f(k, v))
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
            I.flatMap(
              O.fold(
                () =>
                  I.flatMap_(add, ([idx, q]) =>
                    pipe(
                      ref,
                      Ref.update(Map.insert(k, idx)),
                      I.andThen(
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

export function groupBy<O, R1, E1, K, V>(
  f: (o: O) => I.IO<R1, E1, readonly [K, V]>,
  buffer = 16
): <R, E>(stream: Stream<R, E, O>) => GroupBy<R & R1, E | E1, K, V> {
  return (stream) => groupBy_(stream, f, buffer)
}

export function groupByKey_<R, E, O, K>(stream: Stream<R, E, O>, f: (o: O) => K, buffer = 16): GroupBy<R, E, K, O> {
  return pipe(
    stream,
    groupBy((o) => I.succeed(tuple(f(o), o)), buffer)
  )
}

export function groupByKey<O, K>(f: (o: O) => K, buffer = 16): <R, E>(stream: Stream<R, E, O>) => GroupBy<R, E, K, O> {
  return (stream) => groupByKey_(stream, f, buffer)
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
        I.flatMap((o) =>
          pipe(
            I.gen(function* (_) {
              const s = yield* _(state.get)
              const t = yield* _(f(s, o))
              yield* _(state.set(t[0]))
              return C.single(t[1])
            }),
            I.mapError(O.some)
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
  return mapChunks_(ma, (chunks) => C.flatMap_(chunks, (a) => Array.from(f(a))))
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
export function mapConcatChunk_<R, E, A, B>(ma: Stream<R, E, A>, f: (a: A) => ReadonlyArray<B>): Stream<R, E, B> {
  return mapChunks_(ma, (chunks) => C.flatMap_(chunks, f))
}

/**
 * Maps each element to a chunk, and flattens the chunks into the output of
 * this stream.
 */
export function mapConcatChunk<A, B>(f: (a: A) => ReadonlyArray<B>): <R, E>(ma: Stream<R, E, A>) => Stream<R, E, B> {
  return (ma) => mapConcatChunk_(ma, f)
}

/**
 * Effectfully maps each element to a chunk, and flattens the chunks into
 * the output of this stream.
 */
export function mapConcatChunkM_<R, E, A, R1, E1, B>(
  ma: Stream<R, E, A>,
  f: (a: A) => I.IO<R1, E1, ReadonlyArray<B>>
): Stream<R & R1, E | E1, B> {
  return pipe(ma, mapM(f), mapConcatChunk(identity))
}

/**
 * Effectfully maps each element to a chunk, and flattens the chunks into
 * the output of this stream.
 */
export function mapConcatChunkM<A, R1, E1, B>(
  f: (a: A) => I.IO<R1, E1, ReadonlyArray<B>>
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
                yield* _(out.offer(pipe(p.await, I.mapError(O.some))))
                yield* _(
                  pipe(
                    latch,
                    P.succeed<void>(undefined),
                    I.andThen(
                      pipe(
                        errorSignal.await,
                        I.raceFirst(f(o)),
                        I.tapCause(errorSignal.halt),
                        I.to(p)
                      )
                    ),
                    Semaphore.withPermit(permits),
                    I.fork
                  )
                )
                yield* _(latch.await)
              })
            ),
            M.foldCauseM(flow(Pull.halt, out.offer, I.toManaged()), () =>
              pipe(
                Semaphore.withPermits_(I.unit(), n, permits),
                I.flatMap(() => out.offer(Pull.end)),
                I.toManaged()
              )
            ),
            M.fork
          )
        )
        return pipe(out.take, I.flatten, I.map(C.single))
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
      const doneRef = yield* _(RefM.make<O.Option<boolean>>(O.none()))
      const chunksL = yield* _(sa.proc)
      const chunksR = yield* _(sb.proc)

      const handler = (pull: Pull.Pull<R & R1, E | E1, C | C1>, terminate: boolean) =>
        pipe(
          doneRef.get,
          I.flatMap((o) => {
            if (o._tag === 'Some' && o.value) {
              return I.succeed(false)
            } else {
              return pipe(
                pull,
                I.result,
                I.flatMap((exit) =>
                  pipe(
                    doneRef,
                    RefM.modify((o) => {
                      const causeOrChunk = pipe(
                        exit,
                        Ex.fold(
                          (c): E.Either<O.Option<Ca.Cause<E | E1>>, Chunk<C | C1>> => E.left(Ca.sequenceCauseOption(c)),
                          E.right
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
                          I.as(() => [false, O.some(true)])
                        )
                      } else if (
                        causeOrChunk._tag === 'Left' &&
                        causeOrChunk.left._tag === 'None' &&
                        (terminate || o._tag === 'Some')
                      ) {
                        return pipe(
                          handoff,
                          Ha.offer(<Take.Take<E | E1, C | C1>>Take.end),
                          I.as(() => [false, O.some(true)])
                        )
                      } else {
                        return I.succeed([false, O.some(false)])
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
        const take   = yield* _(done._tag === 'Some' && done.value ? I.some(Ha.poll(handoff)) : Ha.take(handoff))
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
  return mergeWith_(sa, sb, E.left, E.right, strategy)
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
export function fold_<R, E, O, S>(ma: Stream<R, E, O>, s: S, f: (s: S, o: O) => S): I.IO<R, E, S> {
  return M.use_(
    foldWhileManagedM_(ma, s, constTrue, (s, o) => I.succeed(f(s, o))),
    I.succeed
  )
}

/**
 * Executes a pure fold over the stream of values - reduces all elements in the stream to a value of type `S`.
 */
export function fold<O, S>(s: S, f: (s: S, o: O) => S): <R, E>(ma: Stream<R, E, O>) => I.IO<R, E, S> {
  return (ma) => fold_(ma, s, f)
}

/**
 * Executes an effectful fold over the stream of values.
 */
export function foldM_<R, E, O, R1, E1, S>(
  ma: Stream<R, E, O>,
  s: S,
  f: (s: S, o: O) => I.IO<R1, E1, S>
): I.IO<R & R1, E | E1, S> {
  return M.use_(foldWhileManagedM_(ma, s, constTrue, f), I.succeed)
}

/**
 * Executes an effectful fold over the stream of values.
 */
export function foldM<O, R1, E1, S>(
  s: S,
  f: (s: S, o: O) => I.IO<R1, E1, S>
): <R, E>(ma: Stream<R, E, O>) => I.IO<R & R1, E | E1, S> {
  return (ma) => foldM_(ma, s, f)
}

/**
 * Executes a pure fold over the stream of values.
 * Returns a Managed value that represents the scope of the stream.
 */
export function foldManaged_<R, E, O, S>(ma: Stream<R, E, O>, s: S, f: (s: S, o: O) => S): M.Managed<R, E, S> {
  return foldWhileManagedM_(ma, s, constTrue, (s, o) => I.succeed(f(s, o)))
}

/**
 * Executes a pure fold over the stream of values.
 * Returns a Managed value that represents the scope of the stream.
 */
export function foldManaged<O, S>(s: S, f: (s: S, o: O) => S): <R, E>(ma: Stream<R, E, O>) => M.Managed<R, E, S> {
  return (ma) => foldManaged_(ma, s, f)
}

/**
 * Executes an effectful fold over the stream of values.
 * Returns a Managed value that represents the scope of the stream.
 */
export function foldManagedM_<R, E, O, R1, E1, S>(
  ma: Stream<R, E, O>,
  s: S,
  f: (s: S, o: O) => I.IO<R1, E1, S>
): M.Managed<R & R1, E | E1, S> {
  return foldWhileManagedM_(ma, s, constTrue, f)
}

/**
 * Executes an effectful fold over the stream of values.
 * Returns a Managed value that represents the scope of the stream.
 */
export function foldManagedM<O, R1, E1, S>(
  s: S,
  f: (s: S, o: O) => I.IO<R1, E1, S>
): <R, E>(ma: Stream<R, E, O>) => M.Managed<R & R1, E | E1, S> {
  return (ma) => foldManagedM_(ma, s, f)
}

/**
 * Reduces the elements in the stream to a value of type `S`.
 * Stops the fold early when the condition is not fulfilled.
 */
export function foldWhile_<R, E, O, S>(
  ma: Stream<R, E, O>,
  s: S,
  cont: (s: S) => boolean,
  f: (s: S, o: O) => S
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
export function foldWhile<O, S>(
  s: S,
  cont: (s: S) => boolean,
  f: (s: S, o: O) => S
): <R, E>(ma: Stream<R, E, O>) => I.IO<R, E, S> {
  return (ma) => foldWhile_(ma, s, cont, f)
}

/**
 * Executes an effectful fold over the stream of values.
 * Stops the fold early when the condition is not fulfilled.
 */
export function foldWhileM_<R, E, O, R1, E1, S>(
  ma: Stream<R, E, O>,
  s: S,
  cont: (s: S) => boolean,
  f: (s: S, o: O) => I.IO<R1, E1, S>
): I.IO<R & R1, E | E1, S> {
  return M.use_(foldWhileManagedM_(ma, s, cont, f), I.succeed)
}

/**
 * Executes an effectful fold over the stream of values.
 * Stops the fold early when the condition is not fulfilled.
 */
export function foldWhileM<O, R1, E1, S>(
  s: S,
  cont: (s: S) => boolean,
  f: (s: S, o: O) => I.IO<R1, E1, S>
): <R, E>(ma: Stream<R, E, O>) => I.IO<R & R1, E | E1, S> {
  return (ma) => foldWhileM_(ma, s, cont, f)
}

/**
 * Executes a pure fold over the stream of values.
 * Returns a Managed value that represents the scope of the stream.
 * Stops the fold early when the condition is not fulfilled.
 */
export function foldWhileManaged_<R, E, O, S>(
  ma: Stream<R, E, O>,
  s: S,
  cont: (s: S) => boolean,
  f: (s: S, o: O) => S
): M.Managed<R, E, S> {
  return foldWhileManagedM_(ma, s, cont, (s, o) => I.succeed(f(s, o)))
}

/**
 * Executes a pure fold over the stream of values.
 * Returns a Managed value that represents the scope of the stream.
 * Stops the fold early when the condition is not fulfilled.
 */
export function foldWhileManaged<O, S>(
  s: S,
  cont: (s: S) => boolean,
  f: (s: S, o: O) => S
): <R, E>(ma: Stream<R, E, O>) => M.Managed<R, E, S> {
  return (ma) => foldWhileManaged_(ma, s, cont, f)
}

/**
 * Executes an effectful fold over the stream of values.
 * Returns a Managed value that represents the scope of the stream.
 * Stops the fold early when the condition is not fulfilled.
 */
export function foldWhileManagedM_<R, E, O, R1, E1, S>(
  ma: Stream<R, E, O>,
  s: S,
  cont: (s: S) => boolean,
  f: (s: S, o: O) => I.IO<R1, E1, S>
): M.Managed<R & R1, E | E1, S> {
  return pipe(
    ma.proc,
    M.flatMap((is) => {
      const loop = (s1: S): I.IO<R & R1, E | E1, S> => {
        if (!cont(s)) {
          return I.succeed(s1)
        } else {
          return pipe(
            is,
            I.foldM(
              O.fold(() => I.succeed(s1), I.fail),
              flow(C.foldLeftIO(s1, f), I.flatMap(loop))
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
export function foldWhileManagedM<O, R1, E1, S>(
  s: S,
  cont: (s: S) => boolean,
  f: (s: S, o: O) => I.IO<R1, E1, S>
): <R, E>(ma: Stream<R, E, O>) => M.Managed<R & R1, E | E1, S> {
  return (ma) => foldWhileManagedM_(ma, s, cont, f)
}

/**
 * Schedules the output of the stream using the provided `schedule`.
 */
export function schedule_<R, R1, E, O>(
  self: Stream<R, E, O>,
  schedule: Schedule<R1, O, any>
): Stream<R & R1 & Has<Clock>, E, O> {
  return filterMap_(
    scheduleEither_(self, schedule),
    E.fold(
      (_) => O.none(),
      (a) => O.some(a)
    )
  )
}

/**
 * Schedules the output of the stream using the provided `schedule`.
 */
export function schedule<R1, O>(schedule: Schedule<R1, O, any>) {
  return <R, E>(self: Stream<R, E, O>) => schedule_(self, schedule)
}

/**
 * Schedules the output of the stream using the provided `schedule` and emits its output at
 * the end (if `schedule` is finite).
 */
export function scheduleEither_<R, R1, E, O, B>(
  ma: Stream<R, E, O>,
  schedule: Schedule<R1, O, B>
): Stream<R & R1 & Has<Clock>, E, E.Either<B, O>> {
  return scheduleWith(schedule)(E.right, E.left)(ma)
}

/**
 * Schedules the output of the stream using the provided `schedule` and emits its output at
 * the end (if `schedule` is finite).
 */
export function scheduleEither<R1, O, B>(schedule: Schedule<R1, O, B>) {
  return <R, E>(ma: Stream<R, E, O>) => scheduleEither_(ma, schedule)
}

/**
 * Schedules the output of the stream using the provided `schedule` and emits its output at
 * the end (if `schedule` is finite).
 * Uses the provided function to align the stream and schedule outputs on the same type.
 */
export function scheduleWith<R1, O, B>(schedule: Sc.Schedule<R1, O, B>) {
  return <C, D>(f: (o: O) => C, g: (b: B) => D) => <R, E>(
    self: Stream<R, E, O>
  ): Stream<R & R1 & Has<Clock>, E, C | D> => {
    return new Stream(
      M.gen(function* (_) {
        const os     = yield* _(pipe(self.proc, M.mapM(BPull.make)))
        const driver = yield* _(Sc.driver(schedule))

        const pull = pipe(
          os,
          BPull.pullElement,
          I.flatMap((o) =>
            pipe(
              driver.next(o),
              I.as(() => C.single(f(o))),
              I.orElse(() =>
                pipe(
                  driver.last,
                  I.orDie,
                  I.map((b) => tuple(f(o), g(b))),
                  I.apFirst(driver.reset)
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
          I.flatMap((count) => {
            if (count >= n) {
              return Pull.end
            } else {
              return I.gen(function* (_) {
                const chunk = yield* _(chunks)
                const taken = chunk.length <= n - count ? chunk : C.takeLeft_(chunk, n - count)
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

export function take(n: number): <R, E, A>(ma: Stream<R, E, A>) => Stream<R, E, A> {
  return (ma) => take_(ma, n)
}

export function tick(interval: number): Stream<Has<Clock>, never, void> {
  return repeatWith_(undefined, Sc.spaced(interval))
}

export function toQueue(
  capacity = 2
): <R, E, O>(ma: Stream<R, E, O>) => M.Managed<R, never, Queue.Dequeue<Take.Take<E, O>>> {
  return (ma) => toQueue_(ma, capacity)
}

export function toQueueUnbounded<R, E, O>(ma: Stream<R, E, O>): M.Managed<R, never, Queue.Dequeue<Take.Take<E, O>>> {
  return M.gen(function* (_) {
    const queue = yield* _(I.toManaged_(Queue.makeUnbounded<Take.Take<E, O>>(), (q) => q.shutdown))
    yield* _(M.fork(intoManaged_(ma, queue)))
    return queue
  })
}

/**
 * Creates a stream produced from an effect
 */
export function unwrap<R, E, O>(fa: I.IO<R, E, Stream<R, E, O>>): Stream<R, E, O> {
  return flatten(fromEffect(fa))
}

/**
 * Creates a stream produced from a `Managed`
 */
export function unwrapManaged<R, E, A>(fa: M.Managed<R, E, Stream<R, E, A>>): Stream<R, E, A> {
  return flatten(managed(fa))
}

/**
 * Like `into`, but provides the result as a `Managed` to allow for scope
 * composition.
 */
export function intoManaged<E, O, R1, E1>(
  queue: Queue.XQueue<R1, never, never, unknown, Take.Take<E | E1, O>, any>
): <R>(ma: Stream<R, E, O>) => M.Managed<R & R1, E | E1, void> {
  return (ma) => intoManaged_(ma, queue)
}

/**
 * Like `into`, but provides the result as a `Managed` to allow for scope
 * composition.
 */
export function intoManaged_<R, E, O, R1, E1>(
  ma: Stream<R, E, O>,
  queue: Queue.XQueue<R1, never, never, unknown, Take.Take<E | E1, O>, any>
): M.Managed<R & R1, E | E1, void> {
  return M.gen(function* (_) {
    const os = yield* _(ma.proc)

    const pull: I.IO<R & R1, never, void> = pipe(
      os,
      I.foldCauseM(
        flow(
          Ca.sequenceCauseOption,
          O.fold(
            () => pipe(Take.end, queue.offer, I.asUnit),
            (cause) => pipe(cause, Take.halt, queue.offer, I.andThen(pull))
          )
        ),
        (c) => pipe(c, Take.chunk, queue.offer, I.andThen(pull))
      )
    )
    return yield* _(pull)
  })
}

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
export function unfoldChunk<S, A>(s: S, f: (s: S) => Option<readonly [Chunk<A>, S]>): Stream<unknown, never, A> {
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
        I.flatMap((done) => {
          if (done) {
            return Pull.end
          } else {
            return pipe(
              ref.get,
              I.flatMap(f),
              I.foldM(
                Pull.fail,
                O.fold(
                  () => pipe(doneRef.set(true), I.andThen(Pull.end)),
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

/**
 * Zips this stream with another point-wise and applies the function to the paired elements.
 *
 * The new stream will end when one of the sides ends.
 */
export function zipWith_<R, E, A, R1, E1, A1, B>(
  me: Stream<R, E, A>,
  that: Stream<R1, E1, A1>,
  f: (a: A, a1: A1) => B
): Stream<R & R1, E | E1, B> {
  return zipWithPar_(me, that, f, 'seq')
}

/**
 * Zips this stream with another point-wise and applies the function to the paired elements.
 *
 * The new stream will end when one of the sides ends.
 */
export function zipWith<A, R1, E1, A1, B>(
  that: Stream<R1, E1, A1>,
  f: (a: A, a1: A1) => B
): <R, E>(me: Stream<R, E, A>) => Stream<R & R1, E1 | E, B> {
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
    return [mut_fc, E.left(C.drop_(fa, fb.length))]
  }

  return [mut_fc, E.right(C.drop_(fb, fa.length))]
}

export function zipWithIndex<R, E, A>(ma: Stream<R, E, A>): Stream<R, E, readonly [A, number]> {
  return mapAccum_(ma, 0, (index, a) => tuple(index + 1, tuple(a, index)))
}

/**
 * Zips this stream with another point-wise and applies the function to the paired elements.
 *
 * The new stream will end when one of the sides ends.
 *
 * By default pull is executed in parallel to preserve async semantics, see `zipWithSeq` for
 * a sequential alternative
 */
export function zipWithPar_<R, E, O, O2, O3, R1, E1>(
  stream: Stream<R, E, O>,
  that: Stream<R1, E1, O2>,
  f: (a: O, a1: O2) => O3,
  ps: 'seq'
): Stream<R & R1, E1 | E, O3>
export function zipWithPar_<R, E, O, O2, O3, R1, E1>(
  stream: Stream<R, E, O>,
  that: Stream<R1, E1, O2>,
  f: (a: O, a1: O2) => O3,
  ps?: 'par' | 'seq'
): Stream<R & R1, E1 | E, O3>
export function zipWithPar_<R, E, O, O2, O3, R1, E1>(
  stream: Stream<R, E, O>,
  that: Stream<R1, E1, O2>,
  f: (a: O, a1: O2) => O3,
  ps: 'par' | 'seq' = 'par'
): Stream<R & R1, E1 | E, O3> {
  type End = { _tag: 'End' }
  type RightDone<W2> = { _tag: 'RightDone', excessR: Chunk<W2> }
  type LeftDone<W1> = { _tag: 'LeftDone', excessL: Chunk<W1> }
  type Running<W1, W2> = {
    _tag: 'Running'
    excess: E.Either<Chunk<W1>, Chunk<W2>>
  }
  type State<W1, W2> = End | Running<W1, W2> | LeftDone<W1> | RightDone<W2>

  const handleSuccess = (
    leftUpd: Option<Chunk<O>>,
    rightUpd: Option<Chunk<O2>>,
    excess: E.Either<Chunk<O>, Chunk<O2>>
  ): Ex.Exit<Option<never>, readonly [Chunk<O3>, State<O, O2>]> => {
    const [leftExcess, rightExcess] = pipe(
      excess,
      E.fold(
        (l) => tuple<[Chunk<O>, Chunk<O2>]>(l, C.empty()),
        (r) => tuple<[Chunk<O>, Chunk<O2>]>(C.empty(), r)
      )
    )

    const [left, right] = [
      pipe(
        leftUpd,
        O.fold(
          () => leftExcess,
          (upd) => C.concat_(leftExcess, upd)
        )
      ),
      pipe(
        rightUpd,
        O.fold(
          () => rightExcess,
          (upd) => C.concat_(rightExcess, upd)
        )
      )
    ]

    const [emit, newExcess] = _zipChunks(left, right, f)

    if (O.isSome(leftUpd) && O.isSome(rightUpd)) {
      return Ex.succeed(
        tuple<[Chunk<O3>, State<O, O2>]>(emit, {
          _tag: 'Running',
          excess: newExcess
        })
      )
    } else if (O.isNone(leftUpd) && O.isNone(rightUpd)) {
      return Ex.fail(O.none())
    } else {
      return Ex.succeed(
        tuple(
          emit,
          pipe(
            newExcess,
            E.fold(
              (l): State<O, O2> =>
                !C.isEmpty(l)
                  ? {
                      _tag: 'LeftDone',
                      excessL: l
                    }
                  : { _tag: 'End' },
              (r): State<O, O2> =>
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
    stream,
    that,
    <State<O, O2>>{
      _tag: 'Running',
      excess: E.left(C.empty())
    },
    (st, p1, p2) => {
      switch (st._tag) {
        case 'End': {
          return I.pure(Ex.fail(O.none()))
        }
        case 'Running': {
          return pipe(
            p1,
            I.optional,
            ps === 'par'
              ? I.map2Par(I.optional(p2), (l, r) => handleSuccess(l, r, st.excess))
              : I.map2(I.optional(p2), (l, r) => handleSuccess(l, r, st.excess)),
            I.catchAllCause((e) => I.pure(Ex.failure(pipe(e, Ca.map(O.some)))))
          )
        }
        case 'LeftDone': {
          return pipe(
            p2,
            I.optional,
            I.map((r) => handleSuccess(O.none(), r, E.left(st.excessL))),
            I.catchAllCause((e) => I.pure(Ex.failure(pipe(e, Ca.map(O.some)))))
          )
        }
        case 'RightDone': {
          return pipe(
            p1,
            I.optional,
            I.map((l) => handleSuccess(l, O.none(), E.right(st.excessR))),
            I.catchAllCause((e) => I.pure(Ex.failure(pipe(e, Ca.map(O.some)))))
          )
        }
      }
    }
  )
}

/**
 * Zips this stream with another point-wise and applies the function to the paired elements.
 *
 * The new stream will end when one of the sides ends.
 *
 * By default pull is executed in parallel to preserve async semantics, see `zipWithSeq` for
 * a sequential alternative
 */
export function zipWithPar<O, O2, O3, R1, E1>(
  that: Stream<R1, E1, O2>,
  f: (a: O, a1: O2) => O3,
  ps: 'seq'
): <R, E>(stream: Stream<R, E, O>) => Stream<R & R1, E1 | E, O3>
export function zipWithPar<O, O2, O3, R1, E1>(
  that: Stream<R1, E1, O2>,
  f: (a: O, a1: O2) => O3,
  ps?: 'par' | 'seq'
): <R, E>(stream: Stream<R, E, O>) => Stream<R & R1, E1 | E, O3>
export function zipWithPar<O, O2, O3, R1, E1>(
  that: Stream<R1, E1, O2>,
  f: (a: O, a1: O2) => O3,
  ps: 'par' | 'seq' = 'par'
): <R, E>(stream: Stream<R, E, O>) => Stream<R & R1, E1 | E, O3> {
  return (stream) => zipWithPar_(stream, that, f, ps)
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
        const iterator    = f(adapter as any)
        let state         = iterator.next()
        let prematureExit = false
        L.forEach_(replayStack, (a) => {
          if (state.done) prematureExit = true

          state = iterator.next(a)
        })
        if (prematureExit) return fromEffect(I.die(new PrematureGeneratorExit('Stream.gen')))

        if (state.done) return succeed(state.value)

        return flatMap_(state.value.S(), (val) => {
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
  first = (n: number): GroupBy<R, E, K, V> => {
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

  filter = (f: (k: K) => boolean): GroupBy<R, E, K, V> => {
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

  merge = <R1, E1, A>(f: (k: K, s: Stream<unknown, E, V>) => Stream<R1, E1, A>): Stream<R & R1, E | E1, A> => {
    return flatMapPar_(
      this.grouped,
      ([k, q]) => f(k, flattenExitOption(fromQueueWithShutdown(q))),
      Number.MAX_SAFE_INTEGER,
      this.buffer
    )
  }
}
