import type { Clock } from '../../Clock'
import type { Has } from '../../Has'
import type * as SK from '../Sink'

import * as AI from '../../AsyncIterable'
import * as Ca from '../../Cause'
import * as C from '../../Chunk'
import * as E from '../../Either'
import { IllegalArgumentError } from '../../Error'
import * as Ex from '../../Exit'
import * as F from '../../Fiber'
import { flow, identity, pipe } from '../../function'
import * as H from '../../Hub'
import * as I from '../../IO'
import * as L from '../../List'
import * as M from '../../Managed'
import * as O from '../../Option'
import * as Q from '../../Queue'
import * as Ref from '../../Ref'
import * as SC from '../../Schedule'
import { tuple } from '../../tuple'
import * as Ch from '../Channel'
import * as Sink from '../Sink'
import * as BP from './BufferedPull'
import * as HO from './Handoff'
import * as Pull from './Pull'
import * as SER from './SinkEndReason'
import * as Take from './Take'
import { zipChunks_ } from './utils'

export const StreamTypeId = Symbol()
export type StreamTypeId = typeof StreamTypeId

/**
 * A `Stream<R, E, A>` is a description of a program that, when evaluated,
 * may emit 0 or more values of type `A`, may fail with errors of type `E`
 * and uses an environment of type `R`.
 * One way to think of `Stream` is as a `Effect` program that could emit multiple values.
 *
 * `Stream` is a purely functional *pull* based stream. Pull based streams offer
 * inherent laziness and backpressure, relieving users of the need to manage buffers
 * between operators. As an optimization `Stream` does not emit single values, but
 * rather an array of values. This allows the cost of effect evaluation to be
 * amortized.
 *
 * `Stream` forms a monad on its `A` type parameter, and has error management
 * facilities for its `E` type parameter, modeled similarly to `Effect` (with some
 * adjustments for the multiple-valued nature of `Stream`). These aspects allow
 * for rich and expressive composition of streams.
 */
export class Stream<R, E, A> {
  readonly [StreamTypeId]: StreamTypeId = StreamTypeId
  readonly _R!: (_: R) => void
  readonly _E!: () => E
  readonly _A!: () => A

  constructor(readonly channel: Ch.Channel<R, unknown, unknown, unknown, E, C.Chunk<A>, unknown>) {}
}

/**
 * Empty stream
 */
export const empty = fromChunk(C.empty<never>())

/**
 * Returns a stream made of the concatenation in strict order of all the streams
 * produced by passing each element of this stream to `f`
 */
export function bind_<R, E, O, R1, E1, O1>(
  self: Stream<R, E, O>,
  f: (o: O) => Stream<R1, E1, O1>
): Stream<R & R1, E | E1, O1> {
  return new Stream(
    Ch.concatMap_(self.channel, (o) =>
      C.foldl_(
        C.map_(o, (x) => f(x).channel),
        Ch.unit() as Ch.Channel<R1, unknown, unknown, unknown, E1, C.Chunk<O1>, unknown>,
        (s, a) => Ch.bind_(s, () => a)
      )
    )
  )
}

/**
 * Returns a stream made of the concatenation in strict order of all the streams
 * produced by passing each element of this stream to `f`
 *
 * @dataFirst bind_
 */
export function bind<O, R1, E1, O1>(
  f: (o: O) => Stream<R1, E1, O1>
): <R, E>(self: Stream<R, E, O>) => Stream<R & R1, E | E1, O1> {
  return (self) => bind_(self, f)
}

/**
 * Combines the chunks from this stream and the specified stream by repeatedly applying the
 * function `f` to extract a chunk using both sides and conceptually "offer"
 * it to the destination stream. `f` can maintain some internal state to control
 * the combining process, with the initial state being specified by `s`.
 */
export function combineChunks_<R, E, A, R1, E1, A1, S, R2, A2>(
  self: Stream<R, E, A>,
  that: Stream<R1, E1, A1>,
  s: S,
  f: (
    s: S,
    l: I.IO<R, O.Option<E>, C.Chunk<A>>,
    r: I.IO<R1, O.Option<E1>, C.Chunk<A1>>
  ) => I.IO<R2, never, Ex.Exit<O.Option<E | E1>, readonly [C.Chunk<A2>, S]>>
): Stream<R1 & R & R2, E | E1, A2> {
  return unwrapManaged(
    pipe(
      M.do,
      M.bindS('pullLeft', () => toPull(self)),
      M.bindS('pullRight', () => toPull(that)),
      M.map(({ pullLeft, pullRight }) =>
        unfoldChunksM(s, (s) => I.bind_(f(s, pullLeft, pullRight), (ex) => I.optional(I.done(ex))))
      )
    )
  )
}

/**
 * Combines the chunks from this stream and the specified stream by repeatedly applying the
 * function `f` to extract a chunk using both sides and conceptually "offer"
 * it to the destination stream. `f` can maintain some internal state to control
 * the combining process, with the initial state being specified by `s`.
 *
 * @dataFirst combineChunks_
 */
export function combineChunks<R, E, A, R1, E1, A1, S, R2, A2>(
  that: Stream<R1, E1, A1>,
  s: S,
  f: (
    s: S,
    l: I.IO<R, O.Option<E>, C.Chunk<A>>,
    r: I.IO<R1, O.Option<E1>, C.Chunk<A1>>
  ) => I.IO<R2, never, Ex.Exit<O.Option<E | E1>, readonly [C.Chunk<A2>, S]>>
): (self: Stream<R, E, A>) => Stream<R1 & R & R2, E | E1, A2> {
  return (self) => combineChunks_(self, that, s, f)
}

/**
 * Halt a stream with the specified exception
 */
export function die(u: unknown): Stream<unknown, never, never> {
  return new Stream(Ch.die(u))
}

/**
 * Halt a stream with the specified exception
 */
export function dieWith(u: () => unknown): Stream<unknown, never, never> {
  return new Stream(Ch.dieWith(u))
}

/**
 * Halt a stream with the specified error
 */
export function fail<E>(error: E): Stream<unknown, E, never> {
  return new Stream(Ch.fail(error))
}

/**
 * Halt a stream with the specified error
 */
export function failWith<E>(error: () => E): Stream<unknown, E, never> {
  return new Stream(Ch.failWith(error))
}

/**
 * Repeats this stream forever.
 */
export function forever<R, E, A>(self: Stream<R, E, A>): Stream<R, E, A> {
  return new Stream(Ch.repeated(self.channel))
}

/**
 * Creates a stream from a `Chunk` of values
 */
export function fromChunk<O>(c: C.Chunk<O>): Stream<unknown, never, O> {
  return new Stream(Ch.unwrap(I.effectTotal(() => Ch.write(c))))
}

/**
 * Creates a stream from a `Chunk` of values
 */
export function fromChunkTotal<O>(c: () => C.Chunk<O>): Stream<unknown, never, O> {
  return new Stream(Ch.unwrap(I.effectTotal(() => Ch.writeWith(c))))
}

/**
 * Creates a stream from an effect producing a value of type `A`
 */
export function effect<R, E, A>(self: I.IO<R, E, A>): Stream<R, E, A> {
  return new Stream(Ch.unwrap(I.match_(self, Ch.fail, (x) => Ch.write(C.single(x)))))
}

/**
 * Creates a stream from an effect producing a value of type `A` or an empty Stream
 */
export function effectOption<R, E, A>(self: I.IO<R, O.Option<E>, A>): Stream<R, E, A> {
  return new Stream(
    Ch.unwrap(
      I.match_(
        self,
        O.match(() => Ch.unit(), Ch.fail),
        (x) => Ch.write(C.single(x))
      )
    )
  )
}

/**
 * Creates a single-valued stream from a managed resource
 */
export function managed<R, E, A>(self: M.Managed<R, E, A>): Stream<R, E, A> {
  return new Stream(Ch.managedOut(M.map_(self, C.single)))
}

/**
 * Maps over elements of the stream with the specified effectful function.
 */
export function mapM_<R, E, A, R1, E1, B>(
  self: Stream<R, E, A>,
  f: (a: A) => I.IO<R1, E1, B>
): Stream<R & R1, E | E1, B> {
  return loopOnPartialChunksElements_<R, E, A, R1, E1, B>(self, (a, emit) => I.bind_(f(a), emit))
}

/**
 * Maps over elements of the stream with the specified effectful function.
 *
 * @dataFirst mapM_
 */
export function mapM<A, R1, E1, B>(
  f: (a: A) => I.IO<R1, E1, B>
): <R, E>(self: Stream<R, E, A>) => Stream<R & R1, E | E1, B> {
  return (self) => mapM_(self, f)
}

/**
 * Flattens this stream-of-streams into a stream made of the concatenation in
 * strict order of all the streams.
 */
export function flatten<R0, E0, R, E, A>(self: Stream<R0, E0, Stream<R, E, A>>): Stream<R0 & R, E0 | E, A> {
  return bind_(self, identity)
}

/**
 * Loops over the stream chunks concatenating the result of f
 */
export function loopOnChunks_<R, E, A, R1, E1, A1>(
  self: Stream<R, E, A>,
  f: (a: C.Chunk<A>) => Ch.Channel<R1, E | E1, C.Chunk<A>, unknown, E | E1, C.Chunk<A1>, boolean>
): Stream<R & R1, E | E1, A1> {
  const loop: Ch.Channel<R1, E | E1, C.Chunk<A>, unknown, E | E1, C.Chunk<A1>, boolean> = Ch.readWithCause(
    (chunk) => Ch.bind_(f(chunk), (cont) => (cont ? loop : Ch.end(false))),
    Ch.halt,
    (_) => Ch.end(false)
  )
  return new Stream(self.channel['>>>'](loop))
}

/**
 * Loops on chunks emitting partially
 */
export function loopOnPartialChunks_<R, E, A, R1, E1, A1>(
  self: Stream<R, E, A>,
  f: (a: C.Chunk<A>, emit: (a: A1) => I.UIO<void>) => I.IO<R1, E1, boolean>
): Stream<R & R1, E | E1, A1> {
  return loopOnChunks_(self, (chunk) =>
    Ch.unwrap(
      I.deferTotal(() => {
        let outputChunk = C.empty<A1>()
        return I.catchAll_(
          I.map_(
            f(chunk, (a: A1) =>
              I.effectTotal(() => {
                outputChunk = C.append_(outputChunk, a)
              })
            ),
            (cont) => Ch.bind_(Ch.write(outputChunk), () => Ch.end(cont))
          ),
          (failure) =>
            I.effectTotal(() => {
              if (C.isEmpty(outputChunk)) {
                return Ch.fail(failure)
              } else {
                return Ch.bind_(Ch.write(outputChunk), () => Ch.fail(failure))
              }
            })
        )
      })
    )
  )
}

/**
 * Loops on chunks elements emitting partially
 */
export function loopOnPartialChunksElements_<R, E, A, R1, E1, A1>(
  self: Stream<R, E, A>,
  f: (a: A, emit: (a: A1) => I.UIO<void>) => I.IO<R1, E1, void>
): Stream<R & R1, E | E1, A1> {
  return loopOnPartialChunks_(self, (a, emit) =>
    I.as_(
      C.mapM_(a, (a) => f(a, emit)),
      () => true
    )
  )
}

/**
 * Transforms the elements of this stream using the supplied function.
 */
export function map_<R, E, O, O1>(self: Stream<R, E, O>, f: (o: O) => O1): Stream<R, E, O1> {
  return new Stream(Ch.mapOut_(self.channel, (o) => C.map_(o, f)))
}

/**
 * Transforms the elements of this stream using the supplied function.
 *
 * @dataFirst map_
 */
export function map<O, O1>(f: (o: O) => O1): <R, E>(self: Stream<R, E, O>) => Stream<R, E, O1> {
  return (self) => map_(self, f)
}

/**
 * Runs the sink on the stream to produce either the sink's result or an error.
 */
export function run_<R, E, A, R2, E2, Z>(
  self: Stream<R, E, A>,
  sink: Sink.Sink<R2, E, A, E2, unknown, Z>
): I.IO<R & R2, E2, Z> {
  return Ch.runDrain(self.channel['>>>'](sink.channel))
}

/**
 * Runs the sink on the stream to produce either the sink's result or an error.
 *
 * @dataFirst run_
 */
export function run<E, A, R2, E2, Z>(
  sink: Sink.Sink<R2, E, A, E2, unknown, Z>
): <R>(self: Stream<R, E, A>) => I.IO<R & R2, E2, Z> {
  return (self) => run_(self, sink)
}

/**
 * Runs the stream and collects all of its elements to a chunk.
 */
export function runCollect<R, E, A>(self: Stream<R, E, A>): I.IO<R, E, C.Chunk<A>> {
  return run_(self, Sink.collectAll())
}

/**
 * Runs the stream and collects ignore its elements.
 */
export function runDrain<R, E, A>(self: Stream<R, E, A>): I.IO<R, E, void> {
  return run_(self, Sink.drain())
}

/**
 * Consumes all elements of the stream, passing them to the specified callback.
 */
export function runForeach_<R, E, A, R1, E1>(
  sa: Stream<R, E, A>,
  f: (a: A) => I.IO<R1, E1, any>
): I.IO<R & R1, E | E1, void> {
  return run_(sa, Sink.foreach<R1, E | E1, A>(f))
}

/**
 * Consumes all elements of the stream, passing them to the specified callback.
 */
export function runForeach<A, R1, E1>(
  f: (a: A) => I.IO<R1, E1, any>
): <R, E>(sa: Stream<R, E, A>) => I.IO<R & R1, E | E1, void> {
  return (sa) => runForeach_(sa, f)
}

/**
 * Consumes all elements of the stream, passing them to the specified callback.
 */
export function runForeachChunk_<R, E, A, R1, E1>(
  sa: Stream<R, E, A>,
  f: (as: C.Chunk<A>) => I.IO<R1, E1, any>
): I.IO<R & R1, E | E1, void> {
  return run_(sa, Sink.foreachChunk<R1, E | E1, A>(f))
}

/**
 * Consumes all elements of the stream, passing them to the specified callback.
 */
export function runForeachChunk<A, R1, E1>(
  f: (as: C.Chunk<A>) => I.IO<R1, E1, any>
): <R, E>(sa: Stream<R, E, A>) => I.IO<R & R1, E | E1, void> {
  return (sa) => runForeachChunk_(sa, f)
}

/**
 * Creates a single-valued pure stream
 */
export function succeed<O>(o: O): Stream<unknown, never, O> {
  return fromChunk(C.single(o))
}

/**
 * Creates a single-valued pure stream
 */
export function effectTotal<O>(o: () => O): Stream<unknown, never, O> {
  return fromChunkTotal(() => C.single(o()))
}

function takeLoop<E, A>(n: number): Ch.Channel<unknown, E, C.Chunk<A>, unknown, E, C.Chunk<A>, unknown> {
  return Ch.readWithCause(
    (i) => {
      const taken = C.take_(i, n)
      const left  = Math.max(n - taken.length, 0)
      if (left > 0) {
        return Ch.bind_(Ch.write(taken), () => takeLoop(left))
      } else {
        return Ch.write(taken)
      }
    },
    Ch.halt,
    Ch.end
  )
}

/**
 * Takes the specified number of elements from this stream.
 */
export function take_<R, E, A>(self: Stream<R, E, A>, n: number): Stream<R, E, A> {
  if (n <= 0) {
    return empty
  }
  if (!Number.isInteger(n)) {
    return die(new IllegalArgumentError(`${n} should be an integer`, 'Stream.take'))
  }
  return new Stream(self.channel['>>>'](takeLoop(n)))
}

/**
 * Takes the specified number of elements from this stream.
 *
 * @dataFirst take_
 */
export function take(n: number): <R, E, A>(self: Stream<R, E, A>) => Stream<R, E, A> {
  return (self) => take_(self, n)
}

/**
 * Interpret the stream as a managed pull
 */
export function toPull<R, E, A>(self: Stream<R, E, A>): M.Managed<R, never, I.IO<R, O.Option<E>, C.Chunk<A>>> {
  return M.map_(Ch.toPull(self.channel), (pull) =>
    I.mapError_(pull, (e) => (e._tag === 'Left' ? O.some(e.left) : O.none()))
  )
}

function unfoldChunksLoop<S, R, E, A>(
  s: S,
  f: (s: S) => I.IO<R, E, O.Option<readonly [C.Chunk<A>, S]>>
): Ch.Channel<R, unknown, unknown, unknown, E, C.Chunk<A>, unknown> {
  return Ch.unwrap(
    I.map_(
      f(s),
      O.match(
        () => Ch.unit(),
        ([as, s]) => Ch.bind_(Ch.write(as), () => unfoldChunksLoop(s, f))
      )
    )
  )
}

/**
 * Creates a stream by effectfully peeling off the "layers" of a value of type `S`
 */
export function unfoldChunksM<R, E, A, S>(
  s: S,
  f: (s: S) => I.IO<R, E, O.Option<readonly [C.Chunk<A>, S]>>
): Stream<R, E, A> {
  return new Stream(unfoldChunksLoop(s, f))
}

/**
 * Creates a stream produced from an effect
 */
export function unwrap<R0, E0, R, E, A>(self: I.IO<R0, E0, Stream<R, E, A>>): Stream<R0 & R, E0 | E, A> {
  return flatten(effect(self))
}

/**
 * Creates a stream produced from a managed
 */
export function unwrapManaged<R0, E0, R, E, A>(self: M.Managed<R0, E0, Stream<R, E, A>>): Stream<R0 & R, E0 | E, A> {
  return flatten(managed(self))
}

/**
 * Submerges the error case of an `Either` into the `ZStream`.
 */
export function absolve<R, E, E2, A>(xs: Stream<R, E, E.Either<E2, A>>): Stream<R, E | E2, A> {
  return mapM_(xs, (_) => I.fromEither(() => _))
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
 * Any sink can be used here, but see `Sink.foldWeightedM` and `Sink.foldUntilM` for
 * sinks that cover the common usecases.
 */
export function aggregateAsync_<R, R1, E extends E1, E1, E2, A extends A1, A1, B>(
  self: Stream<R, E, A>,
  sink: SK.Sink<R1, E1, A1, E2, A1, B>
): Stream<R & R1 & Has<Clock>, E2, B> {
  return aggregateAsyncWithin_(self, sink, SC.forever)
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
 * Any sink can be used here, but see `Sink.foldWeightedM` and `Sink.foldUntilM` for
 * sinks that cover the common usecases.
 */
export function aggregateAsync<R1, E1, E2, A1, B>(sink: SK.Sink<R1, E1, A1, E2, A1, B>) {
  return <R, E extends E1, A extends A1>(self: Stream<R, E, A>) => aggregateAsync_(self, sink)
}

/**
 * Like `aggregateAsyncWithinEither`, but only returns the `Right` results.
 */
export function aggregateAsyncWithin_<R, R1, R2, E extends E1, E1, E2, A extends A1, A1, B, C>(
  self: Stream<R, E, A>,
  sink: SK.Sink<R1, E1, A1, E2, A1, B>,
  schedule: SC.Schedule<R2, O.Option<B>, C>
): Stream<R & R1 & R2 & Has<Clock>, E2, B> {
  return collect_(
    aggregateAsyncWithinEither_(self, sink, schedule),
    E.match(
      () => O.none(),
      (v) => O.some(v)
    )
  )
}

/**
 * Like `aggregateAsyncWithinEither`, but only returns the `Right` results.
 */
export function aggregateAsyncWithin<R1, R2, E1, E2, A1, B, C>(
  sink: SK.Sink<R1, E1, A1, E2, A1, B>,
  schedule: SC.Schedule<R2, O.Option<B>, C>
) {
  return <R, E extends E1, A extends A1>(self: Stream<R, E, A>) => aggregateAsyncWithin_(self, sink, schedule)
}

/**
 * Aggregates elements using the provided sink until it completes, or until the
 * delay signalled by the schedule has passed.
 *
 * This operator divides the stream into two asynchronous islands. Operators upstream
 * of this operator run on one fiber, while downstream operators run on another. Elements
 * will be aggregated by the sink until the downstream fiber pulls the aggregated value,
 * or until the schedule's delay has passed.
 *
 * Aggregated elements will be fed into the schedule to determine the delays between
 * pulls.
 */
export function aggregateAsyncWithinEither_<R, R1, R2, E extends E1, E1, E2, A extends A1, A1, B, C>(
  self: Stream<R, E, A>,
  sink: SK.Sink<R1, E1, A1, E2, A1, B>,
  schedule: SC.Schedule<R2, O.Option<B>, C>
): Stream<R & R1 & R2 & Has<Clock>, E2, E.Either<C, B>> {
  type HandoffSignal = HO.HandoffSignal<C, E1, A>
  type SinkEndReason = SER.SinkEndReason<C>

  const deps = I.sequenceT(
    HO.make<HandoffSignal>(),
    Ref.makeRef<SinkEndReason>(new SER.SinkEnd()),
    Ref.makeRef(C.empty<A1>()),
    SC.driver(schedule)
  )

  return bind_(fromEffect(deps), ([handoff, sinkEndReason, sinkLeftovers, scheduleDriver]) => {
    const handoffProducer: Ch.Channel<unknown, E1, C.Chunk<A>, unknown, never, never, any> = Ch.readWithCause(
      (_in: C.Chunk<A>) => Ch.zipr_(Ch.fromEffect(HO.offer(handoff, new HO.Emit(_in))), handoffProducer),
      (cause: Ca.Cause<E1>) => Ch.fromEffect(HO.offer(handoff, new HO.Halt(cause))),
      (_: any) => Ch.fromEffect(HO.offer(handoff, new HO.End(new SER.UpstreamEnd())))
    )

    const handoffConsumer: Ch.Channel<unknown, unknown, unknown, unknown, E1, C.Chunk<A1>, void> = Ch.unwrap(
      I.bind_(Ref.getAndSet_(sinkLeftovers, C.empty<A1>()), (leftovers) => {
        if (C.isEmpty(leftovers)) {
          return I.succeed(Ch.zipr_(Ch.write(leftovers), handoffConsumer))
        } else {
          return I.map_(HO.take(handoff), (_) => {
            switch (_._typeId) {
              case HO.EmitTypeId:
                return Ch.zipr_(Ch.write(_.els), handoffConsumer)
              case HO.HaltTypeId:
                return Ch.halt(_.error)
              case HO.EndTypeId:
                return Ch.fromEffect(Ref.set_(sinkEndReason, _.reason))
            }
          })
        }
      })
    )

    const scheduledAggregator = (
      lastB: O.Option<B>
    ): Ch.Channel<R1 & R2 & Has<Clock>, unknown, unknown, unknown, E2, C.Chunk<E.Either<C, B>>, any> => {
      const timeout = I.matchCauseM_(
        scheduleDriver.next(lastB),
        (_) =>
          E.match_(
            Ca.failureOrCause(_),
            (_) => HO.offer(handoff, new HO.End(new SER.ScheduleTimeout())),
            (cause) => HO.offer(handoff, new HO.Halt(cause))
          ),
        (c) => HO.offer(handoff, new HO.End(new SER.ScheduleEnd(c)))
      )

      return pipe(
        Ch.managed_(I.forkManaged(timeout), (fiber) => {
          return Ch.bind_(Ch.doneCollect(handoffConsumer['>>>'](sink.channel)), ([leftovers, b]) => {
            return Ch.zipr_(
              Ch.fromEffect(I.apr_(F.interrupt(fiber), Ref.set_(sinkLeftovers, C.flatten(leftovers)))),
              Ch.unwrap(
                Ref.modify_(sinkEndReason, (reason) => {
                  switch (reason._typeId) {
                    case SER.ScheduleEndTypeId:
                      return tuple(
                        Ch.as_(Ch.write(C.from([E.right(b), E.left(reason.c)])), O.some(b)),
                        new SER.SinkEnd()
                      )
                    case SER.ScheduleTimeoutTypeId:
                      return tuple(Ch.as_(Ch.write(C.single(E.right(b))), O.some(b)), new SER.SinkEnd())
                    case SER.SinkEndTypeId:
                      return tuple(Ch.as_(Ch.write(C.single(E.right(b))), O.some(b)), new SER.SinkEnd())
                    case SER.UpstreamEndTypeId:
                      return tuple(Ch.as_(Ch.write(C.single(E.right(b))), O.none()), new SER.UpstreamEnd())
                  }
                })
              )
            )
          })
        }),
        Ch.bind((_) => {
          if (O.isNone(_)) {
            return Ch.unit()
          } else {
            return scheduledAggregator(_)
          }
        })
      )
    }

    return zipRight_(
      managed(pipe(self.channel['>>>'](handoffProducer), Ch.runManaged, M.fork)),
      new Stream(scheduledAggregator(O.none()))
    )
  })
}

/**
 * Aggregates elements using the provided sink until it completes, or until the
 * delay signalled by the schedule has passed.
 *
 * This operator divides the stream into two asynchronous islands. Operators upstream
 * of this operator run on one fiber, while downstream operators run on another. Elements
 * will be aggregated by the sink until the downstream fiber pulls the aggregated value,
 * or until the schedule's delay has passed.
 *
 * Aggregated elements will be fed into the schedule to determine the delays between
 * pulls.
 */
export function aggregateAsyncWithinEither<R1, R2, E1, E2, A1, B, C>(
  sink: SK.Sink<R1, E1, A1, E2, A1, B>,
  schedule: SC.Schedule<R2, O.Option<B>, C>
) {
  return <R, E extends E1, A extends A1>(self: Stream<R, E, A>) => aggregateAsyncWithinEither_(self, sink, schedule)
}

/**
 * Maps the success values of this stream to the specified constant value.
 */
export function as_<R, E, A, A2>(self: Stream<R, E, A>, a2: A2): Stream<R, E, A2> {
  return map_(self, (_) => a2)
}

/**
 * Maps the success values of this stream to the specified constant value.
 */
export function as<A2>(a2: A2) {
  return <R, E, A>(self: Stream<R, E, A>) => as_(self, a2)
}

/**
 * Returns a stream whose failure and success channels have been mapped by
 * the specified pair of functions, `f` and `g`.
 */
export function bimap_<R, E, E1, A, A1>(self: Stream<R, E, A>, f: (e: E) => E1, g: (a: A) => A1): Stream<R, E1, A1> {
  return map_(mapError_(self, f), g)
}

/**
 * Returns a stream whose failure and success channels have been mapped by
 * the specified pair of functions, `f` and `g`.
 */
export function bimap<E, E1, A, A1>(f: (e: E) => E1, g: (a: A) => A1) {
  return <R>(self: Stream<R, E, A>) => bimap_(self, f, g)
}

/**
 * Fan out the stream, producing a dynamic number of streams that have the same elements as this stream.
 * The driver stream will only ever advance of the `maximumLag` chunks before the
 * slowest downstream stream.
 */
export function broadcastDynamic_<R, E, A>(
  self: Stream<R, E, A>,
  maximumLag: number
): M.Managed<R, never, Stream<unknown, E, A>> {
  return M.map_(broadcastedQueuesDynamic_(self, maximumLag), (_) => pipe(managed(_), bind(fromQueue()), flattenTake))
}

/**
 * Fan out the stream, producing a dynamic number of streams that have the same elements as this stream.
 * The driver stream will only ever advance of the `maximumLag` chunks before the
 * slowest downstream stream.
 */
export function broadcastDynamic(maximumLag: number) {
  return <R, E, A>(self: Stream<R, E, A>) => broadcastDynamic_(self, maximumLag)
}

/**
 * Converts the stream to a managed list of queues. Every value will be replicated to every queue with the
 * slowest queue being allowed to buffer `maximumLag` chunks before the driver is backpressured.
 *
 * Queues can unsubscribe from upstream by shutting down.
 */
export function broadcastedQueues_<R, E, A>(
  self: Stream<R, E, A>,
  n: number,
  maximumLag: number
): M.Managed<R, never, C.Chunk<H.HubDequeue<unknown, never, Take.Take<E, A>>>> {
  return pipe(
    M.do,
    M.bindS('hub', () => I.toManaged_(H.makeBounded<Take.Take<E, A>>(maximumLag))),
    M.bindS('queues', ({ hub }) => M.collectAll(C.fill(n, () => H.subscribe(hub)))),
    M.tap(({ hub }) => M.fork(runIntoHubManaged_(self, hub))),
    M.map(({ queues }) => queues)
  )
}

/**
 * Converts the stream to a managed list of queues. Every value will be replicated to every queue with the
 * slowest queue being allowed to buffer `maximumLag` chunks before the driver is backpressured.
 *
 * Queues can unsubscribe from upstream by shutting down.
 */
export function broadcastedQueues(n: number, maximumLag: number) {
  return <R, E, A>(self: Stream<R, E, A>) => broadcastedQueues_(self, n, maximumLag)
}

/**
 * Converts the stream to a managed dynamic amount of queues. Every chunk will be replicated to every queue with the
 * slowest queue being allowed to buffer `maximumLag` chunks before the driver is backpressured.
 *
 * Queues can unsubscribe from upstream by shutting down.
 */
export function broadcastedQueuesDynamic_<R, E, A>(
  self: Stream<R, E, A>,
  maximumLag: number
): M.Managed<R, never, M.Managed<unknown, never, H.HubDequeue<unknown, never, Take.Take<E, A>>>> {
  return M.map_(toHub_(self, maximumLag), (_) => H.subscribe(_))
}

/**
 * Converts the stream to a managed dynamic amount of queues. Every chunk will be replicated to every queue with the
 * slowest queue being allowed to buffer `maximumLag` chunks before the driver is backpressured.
 *
 * Queues can unsubscribe from upstream by shutting down.
 */
export function broadcastedQueuesDynamic(maximumLag: number) {
  return <R, E, A>(self: Stream<R, E, A>) => broadcastedQueuesDynamic_(self, maximumLag)
}

/**
 * Allows a faster producer to progress independently of a slower consumer by buffering
 * up to `capacity` chunks in a queue.
 */
export function buffer_<R, E, A>(self: Stream<R, E, A>, capacity: number): Stream<R, E, A> {
  const queue = toQueue_(self, capacity)

  return new Stream(
    Ch.managed_(queue, (queue) => {
      const process: Ch.Channel<unknown, unknown, unknown, unknown, E, C.Chunk<A>, void> = Ch.bind_(
        Ch.fromEffect(Q.take(queue)),
        Take.fold(
          Ch.end(undefined),
          (error) => Ch.halt(error),
          (value) => Ch.zipr_(Ch.write(value), process)
        )
      )

      return process
    })
  )
}

/**
 * Allows a faster producer to progress independently of a slower consumer by buffering
 * up to `capacity` chunks in a queue.
 */
export function buffer(capacity: number) {
  return <R, E, A>(self: Stream<R, E, A>) => buffer_(self, capacity)
}

/**
 * Allows a faster producer to progress independently of a slower consumer by buffering
 * elements into an unbounded queue.
 */
export function bufferUnbounded<R, E, A>(self: Stream<R, E, A>): Stream<R, E, A> {
  const queue = toQueueUnbounded(self)

  return new Stream(
    Ch.managed_(queue, (queue) => {
      const process: Ch.Channel<unknown, unknown, unknown, unknown, E, C.Chunk<A>, void> = Ch.bind_(
        Ch.fromEffect(Q.take(queue)),
        Take.fold(
          Ch.end(undefined),
          (error) => Ch.halt(error),
          (value) => Ch.zipr_(Ch.write(value), process)
        )
      )

      return process
    })
  )
}

/**
 * Switches over to the stream produced by the provided function in case this one
 * fails with a typed error.
 */
export function catchAll_<R, R1, E, E1, A, A1>(
  self: Stream<R, E, A>,
  f: (e: E) => Stream<R1, E1, A1>
): Stream<R & R1, E1, A | A1> {
  return catchAllCause_(self, (_) => E.match_(Ca.failureOrCause(_), f, (_) => halt(_)))
}

/**
 * Switches over to the stream produced by the provided function in case this one
 * fails with a typed error.
 */
export function catchAll<R1, E, E1, A1>(f: (e: E) => Stream<R1, E1, A1>) {
  return <R, A>(self: Stream<R, E, A>) => catchAll_(self, f)
}

/**
 * Switches over to the stream produced by the provided function in case this one
 * fails. Allows recovery from all causes of failure, including interruption if the
 * stream is uninterruptible.
 */
export function catchAllCause_<R, R1, E, E1, A, A1>(
  self: Stream<R, E, A>,
  f: (cause: Ca.Cause<E>) => Stream<R1, E1, A1>
): Stream<R & R1, E1, A | A1> {
  const channel: Ch.Channel<R & R1, unknown, unknown, unknown, E1, C.Chunk<A | A1>, unknown> = Ch.catchAllCause_(
    self.channel,
    (_) => f(_).channel
  )

  return new Stream(channel)
}

/**
 * Switches over to the stream produced by the provided function in case this one
 * fails. Allows recovery from all causes of failure, including interruption if the
 * stream is uninterruptible.
 */
export function catchAllCause<R1, E, E1, A1>(f: (cause: Ca.Cause<E>) => Stream<R1, E1, A1>) {
  return <R, A>(self: Stream<R, E, A>) => catchAllCause_(self, f)
}

/**
 * Switches over to the stream produced by the provided function in case this one
 * fails with some typed error.
 */
export function catchSome_<R, R1, E, E1, A, A1>(
  self: Stream<R, E, A>,
  pf: (e: E) => O.Option<Stream<R1, E1, A1>>
): Stream<R & R1, E | E1, A | A1> {
  return catchAll_(self, (e) =>
    O.match_(
      pf(e),
      () => fail<E | E1>(e),
      (_) => _
    )
  )
}

/**
 * Switches over to the stream produced by the provided function in case this one
 * fails with some typed error.
 */
export function catchSome<R1, E, E1, A1>(pf: (e: E) => O.Option<Stream<R1, E1, A1>>) {
  return <R, A>(self: Stream<R, E, A>) => catchSome_(self, pf)
}

/**
 * Switches over to the stream produced by the provided function in case this one
 * fails with some errors. Allows recovery from all causes of failure, including interruption if the
 * stream is uninterruptible.
 */
export function catchSomeCause_<R, R1, E, E1, A, A1>(
  self: Stream<R, E, A>,
  pf: (e: Ca.Cause<E>) => O.Option<Stream<R1, E1, A1>>
): Stream<R & R1, E | E1, A | A1> {
  return catchAllCause_(
    self,
    (e): Stream<R1, E | E1, A1> =>
      O.match_(
        pf(e),
        () => halt(e),
        (_) => _
      )
  )
}

/**
 * Switches over to the stream produced by the provided function in case this one
 * fails with some errors. Allows recovery from all causes of failure, including interruption if the
 * stream is uninterruptible.
 */
export function catchSomeCause<R1, E, E1, A1>(pf: (e: Ca.Cause<E>) => O.Option<Stream<R1, E1, A1>>) {
  return <R, A>(self: Stream<R, E, A>) => catchSomeCause_(self, pf)
}

class Rechunker<A> {
  private builder = C.builder<A>()
  private pos     = 0

  constructor(readonly n: number) {}

  /* eslint-disable functional/immutable-data */
  write(elem: A) {
    this.builder.append(elem)
    this.pos += 1

    if (this.pos === this.n) {
      const result = this.builder.result()

      this.builder = C.builder()
      this.pos     = 0

      return result
    }

    return null
  }

  emitOfNotEmpty() {
    if (this.pos !== 0) {
      return Ch.write(this.builder.result())
    } else {
      return Ch.unit()
    }
  }
  /* eslint-enable */
}

/**
 * Re-chunks the elements of the stream into chunks of
 * `n` elements each.
 * The last chunk might contain less than `n` elements
 */
export function chunkN_<R, E, A>(self: Stream<R, E, A>, n: number): Stream<R, E, A> {
  return unwrap(
    I.effectTotal(() => {
      const rechunker                                                           = new Rechunker<A>(n)
      const process: Ch.Channel<R, E, C.Chunk<A>, unknown, E, C.Chunk<A>, void> = Ch.readWithCause(
        (chunk) => {
          const chunkSize = chunk.length

          if (chunkSize > 0) {
            let chunks                    = L.empty<C.Chunk<A>>()
            let result: C.Chunk<A> | null = null
            let i                         = 0

            while (i < chunkSize) {
              while (i < chunkSize && result === null) {
                result = rechunker.write(C.unsafeGet_(chunk, i))
                i     += 1
              }

              if (result !== null) {
                chunks = L.prepend_(chunks, result)
                result = null
              }
            }

            return Ch.zipr_(Ch.writeAll(...L.toArray(L.reverse(chunks))), process)
          }

          return process
        },
        (cause) => Ch.zipr_(rechunker.emitOfNotEmpty(), Ch.halt(cause)),
        (_) => rechunker.emitOfNotEmpty()
      )

      return new Stream(self.channel['>>>'](process))
    })
  )
}

/**
 * Re-chunks the elements of the stream into chunks of
 * `n` elements each.
 * The last chunk might contain less than `n` elements
 */
export function chunkN(n: number) {
  return <R, E, A>(self: Stream<R, E, A>) => chunkN_(self, n)
}

/**
 * Exposes the underlying chunks of the stream as a stream of chunks of elements
 */
export function chunks<R, E, A>(self: Stream<R, E, A>): Stream<R, E, C.Chunk<A>> {
  return mapChunks_(self, C.single)
}

/**
 * Performs a filter and map in a single step.
 */
export function collect_<R, E, A, B>(self: Stream<R, E, A>, f: (a: A) => O.Option<B>): Stream<R, E, B> {
  return mapChunks_(self, C.filterMap(f))
}

/**
 * Performs a filter and map in a single step.
 */
export function collect<A, B>(f: (a: A) => O.Option<B>) {
  return <R, E>(self: Stream<R, E, A>) => collect_(self, f)
}

/**
 * Filters any `Right` values.
 */
export function collectLeft<R, E, L1, A>(self: Stream<R, E, E.Either<L1, A>>): Stream<R, E, L1> {
  return collect_(
    self,
    E.match(
      (a) => O.some(a),
      (_) => O.none()
    )
  )
}

/**
 * Filters any `Left` values.
 */
export function collectRight<R, E, A, R1>(self: Stream<R, E, E.Either<A, R1>>): Stream<R, E, R1> {
  return collect_(
    self,
    E.match(
      (_) => O.none(),
      (a) => O.some(a)
    )
  )
}

/**
 * Filters any `None` values.
 */
export function collectSome<R, E, A>(self: Stream<R, E, O.Option<A>>): Stream<R, E, A> {
  return collect_(self, (a) => a)
}

/**
 * Filters any `Exit.Failure` values.
 */
export function collectSuccess<R, E, A, L1>(self: Stream<R, E, Ex.Exit<L1, A>>) {
  return collect_(
    self,
    Ex.match(
      (_) => O.none(),
      (a) => O.some(a)
    )
  )
}

/**
 * Performs an effectful filter and map in a single step.
 */
export function collectM_<R, R1, E, E1, A, A1>(
  self: Stream<R, E, A>,
  pf: (a: A) => O.Option<I.IO<R1, E1, A1>>
): Stream<R & R1, E | E1, A1> {
  return loopOnPartialChunksElements_(self, (a, emit) =>
    O.match_(
      pf(a),
      () => I.unit(),
      (_) => I.asUnit(I.bind_(_, emit))
    )
  )
}

/**
 * Performs an effectful filter and map in a single step.
 */
export function collectM<R1, E1, A, A1>(pf: (a: A) => O.Option<I.IO<R1, E1, A1>>) {
  return <R, E>(self: Stream<R, E, A>) => collectM_(self, pf)
}

/**
 * Transforms all elements of the stream for as long as the specified partial function is defined.
 */
export function collectWhile_<R, E, A, A1>(self: Stream<R, E, A>, pf: (a: A) => O.Option<A1>): Stream<R, E, A1> {
  const loop: Ch.Channel<R, E, C.Chunk<A>, unknown, E, C.Chunk<A1>, any> = Ch.readWith(
    (_in) => {
      const mapped = C.collectWhile_(_in, pf)

      if (mapped.length === _in.length) {
        return Ch.zipr_(Ch.write(mapped), loop)
      } else {
        return Ch.write(mapped)
      }
    },
    Ch.fail,
    Ch.succeed
  )

  return new Stream(self.channel['>>>'](loop))
}

/**
 * Transforms all elements of the stream for as long as the specified partial function is defined.
 */
export function collectWhile<A, A1>(pf: (a: A) => O.Option<A1>) {
  return <R, E>(self: Stream<R, E, A>) => collectWhile_(self, pf)
}

/**
 * Terminates the stream when encountering the first `Right`.
 */
export function collectWhileLeft<R, E, A1, L1>(self: Stream<R, E, E.Either<L1, A1>>): Stream<R, E, L1> {
  return collectWhile_(
    self,
    E.match(
      (l) => O.some(l),
      (_) => O.none()
    )
  )
}

/**
 * Effectfully transforms all elements of the stream for as long as the specified partial function is defined.
 */
export function collectWhileM_<R, R1, E, E1, A, A1>(
  self: Stream<R, E, A>,
  pf: (a: A) => O.Option<I.IO<R1, E1, A1>>
): Stream<R & R1, E | E1, A1> {
  return loopOnPartialChunks_(self, (chunk, emit) => {
    const pfSome = (a: A) =>
      O.match_(
        pf(a),
        () => I.succeed(false),
        (_) => I.as_(I.bind_(_, emit), () => true)
      )

    const loop = (chunk: C.Chunk<A>): I.IO<R1, E1, boolean> => {
      if (C.isEmpty(chunk)) {
        return I.succeed(true)
      } else {
        return I.bind_(pfSome(C.unsafeHead(chunk)), (cont) => {
          if (cont) {
            return loop(C.unsafeTail(chunk))
          } else {
            return I.succeed(false)
          }
        })
      }
    }

    return loop(chunk)
  })
}

/**
 * Effectfully transforms all elements of the stream for as long as the specified partial function is defined.
 */
export function collectWhileM<R1, E1, A, A1>(pf: (a: A) => O.Option<I.IO<R1, E1, A1>>) {
  return <R, E>(self: Stream<R, E, A>) => collectWhileM_(self, pf)
}

/**
 * Terminates the stream when encountering the first `None`.
 */
export function collectWhileSome<R, E, A1>(self: Stream<R, E, O.Option<A1>>): Stream<R, E, A1> {
  return collectWhile_(self, identity)
}

/**
 * Terminates the stream when encountering the first `Left`.
 */
export function collectWhileRight<R, E, A1, L1>(self: Stream<R, E, E.Either<L1, A1>>): Stream<R, E, A1> {
  return collectWhile_(
    self,
    E.match(
      () => O.none(),
      (r) => O.some(r)
    )
  )
}

/**
 * Terminates the stream when encountering the first `Exit.Failure`.
 */
export function collectWhileSuccess<R, E, A1, L1>(self: Stream<R, E, Ex.Exit<L1, A1>>): Stream<R, E, A1> {
  return collectWhile_(
    self,
    Ex.match(
      () => O.none(),
      (r) => O.some(r)
    )
  )
}

/**
 * Combines the elements from this stream and the specified stream by repeatedly applying the
 * function `f` to extract an element using both sides and conceptually "offer"
 * it to the destination stream. `f` can maintain some internal state to control
 * the combining process, with the initial state being specified by `s`.
 *
 * Where possible, prefer `Stream#combineChunks` for a more efficient implementation.
 */
export function combine<R, R1, E, E1, A, A2>(self: Stream<R, E, A>, that: Stream<R1, E1, A2>) {
  return <S>(s: S) =>
    <A3>(
      f: (
        s: S,
        eff1: I.IO<R, O.Option<E>, A>,
        eff2: I.IO<R1, O.Option<E1>, A2>
      ) => I.IO<R1, never, Ex.Exit<O.Option<E | E1>, readonly [A3, S]>>
    ): Stream<R1 & R, E | E1, A3> => {
      return unwrapManaged(
        pipe(
          M.do,
          M.bindS('left', () => M.mapM_(toPull(self), BP.make)),
          M.bindS('right', () => M.mapM_(toPull(that), BP.make)),
          M.map(({ left, right }) =>
            unfoldM(s)((s) => I.bind_(f(s, BP.pullElement(left), BP.pullElement(right)), (_) => I.optional(I.done(_))))
          )
        )
      )
    }
}

/**
 * Concatenates the specified stream with this stream, resulting in a stream
 * that emits the elements from this stream and then the elements from the specified stream.
 */
export function concat_<R, R1, E, E1, A, A1>(
  self: Stream<R, E, A>,
  that: Stream<R1, E1, A1>
): Stream<R & R1, E | E1, A | A1> {
  return new Stream<R & R1, E | E1, A | A1>(Ch.zipr_(self.channel, that.channel))
}

/**
 * Concatenates the specified stream with this stream, resulting in a stream
 * that emits the elements from this stream and then the elements from the specified stream.
 */
export function concat<R1, E1, A1>(that: Stream<R1, E1, A1>) {
  return <R, E, A>(self: Stream<R, E, A>) => concat_(self, that)
}

/**
 * Composes this stream with the specified stream to create a cartesian product of elements.
 * The `that` stream would be run multiple times, for every element in the `this` stream.
 */
export function cross_<R, R1, E, E1, A, A1>(
  self: Stream<R, E, A>,
  that: Stream<R1, E1, A1>
): Stream<R & R1, E | E1, readonly [A, A1]> {
  return new Stream(
    Ch.concatMap_(self.channel, (a) =>
      Ch.mapOut_(that.channel, (b) => C.bind_(a, (a) => C.map_(b, (b) => tuple(a, b))))
    )
  )
}

/**
 * Composes this stream with the specified stream to create a cartesian product of elements.
 * The `that` stream would be run multiple times, for every element in the `this` stream.
 */
export function cross<R1, E1, A1>(that: Stream<R1, E1, A1>) {
  return <R, E, A>(self: Stream<R, E, A>) => cross_(self, that)
}

/**
 * Composes this stream with the specified stream to create a cartesian product of elements,
 * but keeps only elements from this stream.
 * The `that` stream would be run multiple times, for every element in the `this` stream.
 */
export function crossLeft_<R, R1, E, E1, A, A1>(
  self: Stream<R, E, A>,
  that: Stream<R1, E1, A1>
): Stream<R & R1, E | E1, A> {
  return map_(cross_(self, that), ([a]) => a)
}

/**
 * Composes this stream with the specified stream to create a cartesian product of elements,
 * but keeps only elements from this stream.
 * The `that` stream would be run multiple times, for every element in the `this` stream.
 */
export function crossLeft<R1, E1, A1>(that: Stream<R1, E1, A1>) {
  return <R, E, A>(self: Stream<R, E, A>) => crossLeft_(self, that)
}

/**
 * Composes this stream with the specified stream to create a cartesian product of elements,
 * but keeps only elements from the other stream.
 * The `that` stream would be run multiple times, for every element in the `this` stream.
 */
export function crossRight_<R, R1, E, E1, A, A1>(
  self: Stream<R, E, A>,
  that: Stream<R1, E1, A1>
): Stream<R & R1, E | E1, A1> {
  return map_(cross_(self, that), ([, a1]) => a1)
}

/**
 * Composes this stream with the specified stream to create a cartesian product of elements,
 * but keeps only elements from the other stream.
 * The `that` stream would be run multiple times, for every element in the `this` stream.
 */
export function crossRight<R1, E1, A1>(that: Stream<R1, E1, A1>) {
  return <R, E, A>(self: Stream<R, E, A>) => crossRight_(self, that)
}

/**
 * Composes this stream with the specified stream to create a cartesian product of elements
 * with a specified function.
 * The `that` stream would be run multiple times, for every element in the `this` stream.
 */
export function crossWith<R, R1, E, E1, A, A1>(self: Stream<R, E, A>, that: Stream<R1, E1, A1>) {
  return <C>(f: (a: A, a1: A1) => C): Stream<R & R1, E | E1, C> => bind_(self, (l) => map_(that, (r) => f(l, r)))
}

/**
 * Creates a stream from an effect producing a value of type `A`
 */
export function fromEffect<R, E, A>(fa: I.IO<R, E, A>): Stream<R, E, A> {
  return fromEffectOption(I.mapError_(fa, O.some))
}

/**
 * Creates a stream from an effect producing a value of type `A` or an empty Stream
 */
export function fromEffectOption<R, E, A>(fa: I.IO<R, O.Option<E>, A>): Stream<R, E, A> {
  return new Stream(
    Ch.unwrap(
      I.match_(
        fa,
        O.match(
          () => Ch.end(undefined),
          (e) => Ch.fail(e)
        ),
        (a) => Ch.write(C.single(a))
      )
    )
  )
}

/**
 * Transforms the chunks emitted by this stream.
 */
export function mapChunks_<R, E, A, A1>(
  self: Stream<R, E, A>,
  f: (chunk: C.Chunk<A>) => C.Chunk<A1>
): Stream<R, E, A1> {
  return new Stream(Ch.mapOut_(self.channel, f))
}

/**
 * Transforms the chunks emitted by this stream.
 */
export function mapChunks<A, A1>(f: (chunk: C.Chunk<A>) => C.Chunk<A1>) {
  return <R, E>(self: Stream<R, E, A>) => mapChunks_(self, f)
}

/**
 * Transforms the errors emitted by this stream using `f`.
 */
export function mapError_<R, E, E1, A>(self: Stream<R, E, A>, f: (e: E) => E1): Stream<R, E1, A> {
  return new Stream(Ch.mapError_(self.channel, f))
}

/**
 * Transforms the errors emitted by this stream using `f`.
 */
export function mapError<E, E1>(f: (e: E) => E1) {
  return <R, A>(self: Stream<R, E, A>) => mapError_(self, f)
}

/**
 * Like `Stream#runIntoHub`, but provides the result as a `Managed` to allow for scope
 * composition.
 */
export function runIntoHubManaged_<R, R1, E extends E1, E1, A>(
  self: Stream<R, E, A>,
  hub: H.XHub<R1, never, never, unknown, Take.Take<E1, A>, any>
): M.Managed<R & R1, E | E1, void> {
  return runIntoManaged_(self, H.toQueue(hub))
}

/**
 * Like `Stream#runIntoHub`, but provides the result as a `Managed` to allow for scope
 * composition.
 */
export function runIntoHubManaged<R1, E1, A>(hub: H.XHub<R1, never, never, unknown, Take.Take<E1, A>, any>) {
  return <R, E extends E1>(self: Stream<R, E, A>) => runIntoHubManaged_(self, hub)
}

/**
 * Like `Stream#into`, but provides the result as a `Managed` to allow for scope
 * composition.
 */
export function runIntoManaged_<R, R1, E extends E1, E1, A>(
  self: Stream<R, E, A>,
  queue: Q.XQueue<R1, never, never, unknown, Take.Take<E1, A>, any>
): M.Managed<R & R1, E | E1, void> {
  const writer: Ch.Channel<R, E, C.Chunk<A>, unknown, E, Take.Take<E | E1, A>, any> = Ch.readWithCause(
    (in_) => Ch.zipr_(Ch.write(Take.chunk(in_)), writer),
    (cause) => Ch.write(Take.halt(cause)),
    (_) => Ch.write(Take.end)
  )

  return pipe(
    self.channel['>>>'](writer),
    Ch.mapOutM((_) => Q.offer_(queue, _)),
    Ch.drain,
    Ch.runManaged,
    M.asUnit
  )
}

/**
 * Like `Stream#into`, but provides the result as a `Managed` to allow for scope
 * composition.
 */
export function runIntoManaged<R1, E1, A>(queue: Q.XQueue<R1, never, never, unknown, Take.Take<E1, A>, any>) {
  return <R, E extends E1>(self: Stream<R, E, A>) => runIntoManaged_(self, queue)
}

/**
 * Unwraps `Exit` values that also signify end-of-stream by failing with `None`.
 *
 * For `Exit<E, A>` values that do not signal end-of-stream, prefer:
 * {{{
 * mapM(stream, _ => T.done(_))
 * }}}
 */
export function flattenExitOption<R, E, E1, A>(self: Stream<R, E, Ex.Exit<O.Option<E1>, A>>): Stream<R, E | E1, A> {
  const processChunk = (
    chunk: C.Chunk<Ex.Exit<O.Option<E1>, A>>,
    cont: Ch.Channel<R, E, C.Chunk<Ex.Exit<O.Option<E1>, A>>, unknown, E | E1, C.Chunk<A>, any>
  ): Ch.Channel<R, E, C.Chunk<Ex.Exit<O.Option<E1>, A>>, unknown, E | E1, C.Chunk<A>, any> => {
    const [toEmit, rest] = C.splitWhere_(chunk, (_) => !Ex.isSuccess(_))
    const next           = O.match_(
      C.head(rest),
      () => cont,
      Ex.match(
        (cause) =>
          O.match_(
            Ca.flipCauseOption(cause),
            () => Ch.end<void>(undefined),
            (cause) => Ch.halt(cause)
          ),
        () => Ch.end<void>(undefined)
      )
    )

    return Ch.zipr_(
      Ch.write(
        C.filterMap_(
          toEmit,
          Ex.match(
            () => O.none(),
            (a) => O.some(a)
          )
        )
      ),
      next
    )
  }

  const process: Ch.Channel<R, E, C.Chunk<Ex.Exit<O.Option<E1>, A>>, unknown, E | E1, C.Chunk<A>, any> =
    Ch.readWithCause(
      (chunk) => processChunk(chunk, process),
      (cause) => Ch.halt(cause),
      (_) => Ch.end(undefined)
    )

  return new Stream(self.channel['>>>'](process))
}

/**
 * Unwraps `Exit` values and flatten chunks that also signify end-of-stream by failing with `None`.
 */
export function flattenTake<R, E, E1, A>(self: Stream<R, E, Take.Take<E1, A>>): Stream<R, E | E1, A> {
  return pipe(
    self,
    map((_) => _.exit),
    flattenExitOption,
    flattenChunks
  )
}

/**
 * Submerges the chunks carried by this stream into the stream's structure, while
 * still preserving them.
 */
export function flattenChunks<R, E, A>(self: Stream<R, E, C.Chunk<A>>): Stream<R, E, A> {
  return new Stream(Ch.mapOut_(self.channel, C.flatten))
}

export const DEFAULT_CHUNK_SIZE = 4096

/**
 * Converts the stream to a managed hub of chunks. After the managed hub is used,
 * the hub will never again produce values and should be discarded.
 */
export function toHub_<R, E, A>(self: Stream<R, E, A>, capacity: number): M.Managed<R, never, H.Hub<Take.Take<E, A>>> {
  return pipe(
    M.do,
    M.bindS('hub', () => I.toManaged_(H.makeBounded<Take.Take<E, A>>(capacity), (_) => H.shutdown(_))),
    M.tap(({ hub }) => M.fork(runIntoHubManaged_(self, hub))),
    M.map(({ hub }) => hub)
  )
}

/**
 * Converts the stream to a managed hub of chunks. After the managed hub is used,
 * the hub will never again produce values and should be discarded.
 */
export function toHub(capacity: number) {
  return <R, E, A>(self: Stream<R, E, A>) => toHub_(self, capacity)
}

/**
 * Creates a stream from a `XQueue` of values
 */
export function fromQueue_<R, E, O>(
  queue: Q.XQueue<never, R, unknown, E, never, O>,
  maxChunkSize: number = DEFAULT_CHUNK_SIZE
): Stream<R, E, O> {
  return repeatEffectChunkOption(
    pipe(
      Q.takeBetween_(queue, 1, maxChunkSize),
      I.map(C.from),
      I.catchAllCause((c) =>
        I.bind_(Q.isShutdown(queue), (down) => {
          if (down && Ca.interrupted(c)) {
            return Pull.end
          } else {
            return Pull.halt(c)
          }
        })
      )
    )
  )
}

/**
 * Creates a stream from a `XQueue` of values
 */
export function fromQueue(maxChunkSize: number = DEFAULT_CHUNK_SIZE) {
  return <R, E, O>(queue: Q.XQueue<never, R, unknown, E, never, O>) => fromQueue_(queue, maxChunkSize)
}

export function ensuring_<R, E, A, R1>(sa: Stream<R, E, A>, fin: I.IO<R1, never, any>): Stream<R & R1, E, A> {
  return new Stream(pipe(sa.channel, Ch.ensuring(fin)))
}

export function ensuring<R1>(fin: I.IO<R1, never, any>): <R, E, A>(sa: Stream<R, E, A>) => Stream<R & R1, E, A> {
  return (sa) => ensuring_(sa, fin)
}

export function fromQueueWithShutdown_<R, E, A>(
  queue: Q.XQueue<never, R, unknown, E, never, A>,
  maxChunkSize: number = DEFAULT_CHUNK_SIZE
): Stream<R, E, A> {
  return pipe(fromQueue_(queue, maxChunkSize), ensuring(queue.shutdown))
}

export function fromQueueWithShutdown(
  maxChunkSize: number = DEFAULT_CHUNK_SIZE
): <R, E, A>(queue: Q.XQueue<never, R, unknown, E, never, A>) => Stream<R, E, A> {
  return (queue) => fromQueueWithShutdown_(queue, maxChunkSize)
}

/**
 * Repeats the provided value infinitely.
 */
export function repeat<A>(a: A): Stream<unknown, never, A> {
  return repeatEffect(I.succeed(a))
}

/**
 * Creates a stream from an effect producing a value of type `A` which repeats forever.
 */
export function repeatEffect<R, E, A>(fa: I.IO<R, E, A>): Stream<R, E, A> {
  return pipe(fa, I.mapError(O.some), repeatEffectOption)
}

/**
 * Creates a stream from an effect producing values of type `A` until it fails with None.
 */
export function repeatEffectOption<R, E, A>(fa: I.IO<R, O.Option<E>, A>): Stream<R, E, A> {
  return pipe(fa, I.map(C.single), repeatEffectChunkOption)
}

/**
 * Creates a stream from an effect producing chunks of `A` values which repeats forever.
 */
export function repeatEffectChunk<R, E, A>(fa: I.IO<R, E, C.Chunk<A>>): Stream<R, E, A> {
  return pipe(fa, I.mapError(O.some), repeatEffectChunkOption)
}

/**
 * Creates a stream from an effect producing chunks of `A` values until it fails with None.
 */
export function repeatEffectChunkOption<R, E, A>(fa: I.IO<R, O.Option<E>, C.Chunk<A>>): Stream<R, E, A> {
  return unfoldChunkM(undefined)((_) => {
    return I.catchAll_(
      I.map_(fa, (chunk) => O.some(tuple(chunk, undefined))),
      O.match(
        () => I.succeed(O.none()),
        (e) => I.fail(e)
      )
    )
  })
}

/**
 * Creates a stream from an effect producing a value of type `A`, which is repeated using the
 * specified schedule.
 */
export function repeatEffectWith<R, E, A>(
  effect: I.IO<R, E, A>,
  schedule: SC.Schedule<R, A, unknown>
): Stream<R & Has<Clock>, E, A> {
  return pipe(
    effect,
    I.cross(SC.driver(schedule)),
    fromEffect,
    bind(([a, driver]) =>
      pipe(
        succeed(a),
        concat(
          unfoldM(a)(
            flow(
              driver.next,
              I.matchM(
                (_) => I.succeed(O.none()),
                () =>
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
 * Repeats the value using the provided schedule.
 */
export function repeatWith<R, A>(a: A, schedule: SC.Schedule<R, A, unknown>): Stream<R & Has<Clock>, never, A> {
  return repeatEffectWith(I.succeed(a), schedule)
}

/**
 * Creates a stream from an asynchronous callback that can be called multiple times.
 * The registration of the callback can possibly return the stream synchronously.
 * The optionality of the error type `E` can be used to signal the end of the stream,
 * by setting it to `None`.
 */
export function effectAsyncOption<R, E, A>(
  register: (
    resolve: (
      next: I.IO<R, O.Option<E>, C.Chunk<A>>,
      offerCb?: (e: Ex.Exit<never, boolean>) => void
    ) => I.UIO<Ex.Exit<never, boolean>>
  ) => O.Option<Stream<R, E, A>>,
  outputBuffer = 16
): Stream<R, E, A> {
  return pipe(
    I.gen(function* (_) {
      const output      = yield* _(Q.makeBounded<Take.Take<E, A>>(outputBuffer))
      const runtime     = yield* _(I.runtime<R>())
      const maybeStream = yield* _(
        I.effectTotal(() => register((k, cb) => pipe(Take.fromPull(k), I.bind(output.offer), runtime.runCancel(cb))))
      )
      if (O.isSome(maybeStream)) {
        return maybeStream.value
      } else {
        return pipe(output, fromQueueWithShutdown(), flattenTake)
      }
    }),
    unwrap
  )
}

export function effectAsync<R, E, A>(
  register: (
    resolve: (
      next: I.IO<R, O.Option<E>, C.Chunk<A>>,
      offerCb?: (e: Ex.Exit<never, boolean>) => void
    ) => I.UIO<Ex.Exit<never, boolean>>
  ) => void,
  outputBuffer = 16
): Stream<R, E, A> {
  return effectAsyncOption((cb) => {
    register(cb)
    return O.none()
  }, outputBuffer)
}

/**
 * Creates a stream by effectfully peeling off the "layers" of a value of type `S`
 */
export function unfoldChunkM<S>(s: S) {
  return <R, E, A>(f: (s: S) => I.IO<R, E, O.Option<readonly [C.Chunk<A>, S]>>): Stream<R, E, A> => {
    const loop = (s: S): Ch.Channel<R, unknown, unknown, unknown, E, C.Chunk<A>, any> =>
      Ch.unwrap(
        I.map_(
          f(s),
          O.match(
            () => Ch.end(undefined),
            ([as, s]) => Ch.zipr_(Ch.write(as), loop(s))
          )
        )
      )

    return new Stream(loop(s))
  }
}

/**
 * Creates a stream by effectfully peeling off the "layers" of a value of type `S`
 */
export function unfoldM<S>(s: S) {
  return <R, E, A>(f: (s: S) => I.IO<R, E, O.Option<readonly [A, S]>>): Stream<R, E, A> => {
    return unfoldChunkM(s)((_) =>
      I.map_(
        f(_),
        O.map(([a, s]) => tuple(C.single(a), s))
      )
    )
  }
}

/**
 * Converts the stream to a managed queue of chunks. After the managed queue is used,
 * the queue will never again produce values and should be discarded.
 */
export function toQueue_<R, E, A>(self: Stream<R, E, A>, capacity = 2): M.Managed<R, never, Q.Queue<Take.Take<E, A>>> {
  return pipe(
    M.do,
    M.bindS('queue', () => I.toManaged_(Q.makeBounded<Take.Take<E, A>>(capacity), Q.shutdown)),
    M.tap(({ queue }) => M.fork(runIntoManaged_(self, queue))),
    M.map(({ queue }) => queue)
  )
}

/**
 * Converts the stream to a managed queue of chunks. After the managed queue is used,
 * the queue will never again produce values and should be discarded.
 */
export function toQueue(capacity = 2) {
  return <R, E, A>(self: Stream<R, E, A>) => toQueue_(self, capacity)
}

/**
 * Converts the stream into an unbounded managed queue. After the managed queue
 * is used, the queue will never again produce values and should be discarded.
 */
export function toQueueUnbounded<R, E, A>(self: Stream<R, E, A>): M.Managed<R, never, Q.Queue<Take.Take<E, A>>> {
  return pipe(
    M.do,
    M.bindS('queue', () => I.toManaged_(Q.makeUnbounded<Take.Take<E, A>>(), Q.shutdown)),
    M.tap(({ queue }) => M.fork(runIntoManaged_(self, queue))),
    M.map(({ queue }) => queue)
  )
}

/**
 * The stream that always halts with `cause`.
 */
export function halt<E>(cause: Ca.Cause<E>): Stream<unknown, E, never> {
  return fromEffect(I.halt(cause))
}

/**
 * Creates a stream from a subscription to a hub.
 */
export function fromHub<R, E, A>(hub: H.XHub<never, R, unknown, E, never, A>): Stream<R, E, A> {
  return bind_(managed(H.subscribe(hub)), fromQueue())
}

function fromIteratorTotalLoop<A>(
  iterator: Iterator<A>
): Ch.Channel<unknown, unknown, unknown, unknown, never, C.Chunk<A>, unknown> {
  return Ch.unwrap(
    I.effectTotal(() => {
      const v = iterator.next()
      return v.done ? Ch.end(undefined) : pipe(Ch.write(C.single(v.value)), Ch.zipr(fromIteratorTotalLoop(iterator)))
    })
  )
}

export function fromIteratorTotal<A>(iterator: () => Iterator<A>): Stream<unknown, never, A> {
  return new Stream(fromIteratorTotalLoop(iterator()))
}

/**
 *
 */
export function toAsyncIterable<R, E, A>(ma: Stream<R, E, A>): M.Managed<R, never, AsyncIterable<E.Either<E, A>>> {
  return M.gen(function* (_) {
    const runtime = yield* _(I.runtime<R>())
    const pull    = yield* _(toPull(ma))
    return AI.asyncIterable(() => {
      let currentChunk: C.Chunk<A> = C.empty()
      return {
        async next(): Promise<IteratorResult<E.Either<E, A>>> {
          if (currentChunk.length === 1) {
            const v      = C.unsafeHead(currentChunk)
            currentChunk = C.empty()
            return { done: false, value: E.right(v) }
          } else if (currentChunk.length > 1) {
            const v      = C.unsafeHead(currentChunk)
            currentChunk = C.unsafeTail(currentChunk)
            return { done: false, value: E.right(v) }
          } else {
            const result = await runtime.runPromiseExit(pull)
            return pipe(
              result,
              Ex.match(
                flow(
                  Ca.failureOrCause,
                  E.match(
                    O.match(
                      () => Promise.resolve({ value: null, done: true }),
                      (e) => Promise.resolve({ value: E.left(e), done: true })
                    ),
                    (ca) => {
                      throw new Ca.FiberFailure(ca)
                    }
                  )
                ),
                (c) => {
                  currentChunk = c
                  return this.next()
                }
              )
            )
          }
        }
      }
    })
  })
}

class Running<W1, W2> {
  readonly _tag = 'Running'
  constructor(readonly excess: E.Either<C.Chunk<W1>, C.Chunk<W2>>) {}
}
class LeftDone<W1> {
  readonly _tag = 'LeftDone'
  constructor(readonly excessL: C.Chunk<W1>) {}
}
class RightDone<W2> {
  readonly _tag = 'RightDone'
  constructor(readonly excessR: C.Chunk<W2>) {}
}
class End {
  readonly _tag = 'End'
}
type State<W1, W2> = Running<W1, W2> | LeftDone<W1> | RightDone<W2> | End

function handleSuccess<A, A1, B>(
  f: (a: A, a1: A1) => B,
  leftUpd: O.Option<C.Chunk<A>>,
  rightUpd: O.Option<C.Chunk<A1>>,
  excess: E.Either<C.Chunk<A>, C.Chunk<A1>>
): Ex.Exit<O.Option<never>, readonly [C.Chunk<B>, State<A, A1>]> {
  const [leftExcess, rightExcess] = E.match_(
    excess,
    (l) => [l, C.empty<A1>()] as const,
    (r) => [C.empty<A>(), r] as const
  )
  const left                      = O.match_(
    leftUpd,
    () => leftExcess,
    (upd) => C.concat_(leftExcess, upd)
  )
  const right                     = O.match_(
    rightUpd,
    () => rightExcess,
    (upd) => C.concat_(rightExcess, upd)
  )
  const [emit, newExcess]         = zipChunks_(left, right, f)

  if (leftUpd._tag === 'Some' && rightUpd._tag === 'Some') {
    return Ex.succeed(tuple(emit, new Running(newExcess)))
  }
  if (leftUpd._tag === 'None' && rightUpd._tag === 'None') {
    return Ex.fail(O.none())
  }
  const newState: State<A, A1> =
    newExcess._tag === 'Left'
      ? C.isEmpty(newExcess.left)
        ? new End()
        : new LeftDone(newExcess.left)
      : C.isEmpty(newExcess.right)
      ? new End()
      : new RightDone(newExcess.right)
  return Ex.succeed(tuple(emit, newState))
}

/**
 * Zips this stream with another point-wise and applies the function to the paired elements.
 *
 * The new stream will end when one of the sides ends.
 */
export function zipWith_<R, E, A, R1, E1, A1, B>(
  self: Stream<R, E, A>,
  that: Stream<R1, E1, A1>,
  f: (a: A, a1: A1) => B
): Stream<R1 & R, E | E1, B> {
  return combineChunks_(self, that, <State<A, A1>>new Running(E.left(C.empty())), (st, p1, p2) => {
    switch (st._tag) {
      case 'End': {
        return I.succeed(Ex.fail(O.none()))
      }
      case 'Running': {
        return I.catchAllCause_(
          I.crossWithPar_(I.optional(p1), I.optional(p2), (l, r) => handleSuccess(f, l, r, st.excess)),
          (e) => I.succeed(Ex.halt(Ca.map_(e, O.some)))
        )
      }
      case 'LeftDone': {
        return I.catchAllCause_(
          I.map_(I.optional(p2), (l) => handleSuccess(f, O.none(), l, E.left(st.excessL))),
          (e) => I.succeed(Ex.halt(Ca.map_(e, O.some)))
        )
      }
      case 'RightDone': {
        return I.catchAllCause_(
          I.map_(I.optional(p1), (r) => handleSuccess(f, r, O.none(), E.right(st.excessR))),
          (e) => I.succeed(Ex.halt(Ca.map_(e, O.some)))
        )
      }
    }
  })
}

/**
 * Zips this stream with another point-wise and applies the function to the paired elements.
 *
 * The new stream will end when one of the sides ends.
 *
 * @dataFirst zipWith_
 */
export function zipWith<A, R1, E1, A1, B>(
  that: Stream<R1, E1, A1>,
  f: (a: A, a1: A1) => B
): <R, E>(self: Stream<R, E, A>) => Stream<R1 & R, E | E1, B> {
  return (self) => zipWith_(self, that, f)
}

/**
 * Zips this stream with another point-wise and emits tuples of elements from both streams.
 *
 * The new stream will end when one of the sides ends.
 */
export function zip_<R, E, A, R1, E1, A1>(
  self: Stream<R, E, A>,
  that: Stream<R1, E1, A1>
): Stream<R1 & R, E | E1, readonly [A, A1]> {
  return zipWith_(self, that, tuple)
}

/**
 * Zips this stream with another point-wise and emits tuples of elements from both streams.
 *
 * The new stream will end when one of the sides ends.
 *
 * @dataFirst zip_
 */
export function zip<R1, E1, A1>(
  that: Stream<R1, E1, A1>
): <R, E, A>(self: Stream<R, E, A>) => Stream<R1 & R, E | E1, readonly [A, A1]> {
  return (self) => zip_(self, that)
}

/**
 * Zips this stream with another point-wise, but keeps only the outputs of the other stream.
 *
 * The new stream will end when one of the sides ends.
 */
export function zipRight_<R, R1, E, E1, A, A1>(
  self: Stream<R, E, A>,
  that: Stream<R1, E1, A1>
): Stream<R1 & R, E | E1, A1> {
  return zipWith_(self, that, (_, o) => o)
}

/**
 * Zips this stream with another point-wise, but keeps only the outputs of the other stream.
 *
 * The new stream will end when one of the sides ends.
 */
export function zipRight<R, R1, E, E1, A, A1>(that: Stream<R1, E1, A1>) {
  return (self: Stream<R, E, A>) => zipRight_(self, that)
}

/**
 * Zips this stream with another point-wise, but keeps only the outputs of this stream.
 *
 * The new stream will end when one of the sides ends.
 */
export function zipLeft_<R, R1, E, E1, A, A1>(
  self: Stream<R, E, A>,
  that: Stream<R1, E1, A1>
): Stream<R1 & R, E | E1, A> {
  return zipWith_(self, that, (o, _) => o)
}

/**
 * Zips this stream with another point-wise, but keeps only the outputs of this stream.
 *
 * The new stream will end when one of the sides ends.
 */
export function zipLeft<R, R1, E, E1, A, A1>(that: Stream<R1, E1, A1>) {
  return (self: Stream<R, E, A>) => zipLeft_(self, that)
}
