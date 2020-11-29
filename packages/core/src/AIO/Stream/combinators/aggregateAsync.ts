import { flow, pipe } from "@principia/prelude";

import * as A from "../../../Array";
import * as E from "../../../Either";
import * as O from "../../../Option";
import type { HasClock } from "../../Clock";
import * as Ex from "../../Exit";
import type { Fiber } from "../../Fiber";
import * as Fi from "../../Fiber";
import * as M from "../../Managed";
import type { Schedule } from "../../Schedule";
import * as Sc from "../../Schedule";
import * as T from "../../AIO";
import * as XR from "../../XRef";
import * as Ha from "../internal/Handoff";
import type * as Pull from "../internal/Pull";
import * as Take from "../internal/Take";
import { Stream } from "../model";
import type { Transducer } from "../Transducer/model";
import { filterMap_ } from "./filterMap";
import { flattenTake } from "./flattenTake";

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
  schedule: Schedule<R1, ReadonlyArray<P>, Q>
): <R, E>(stream: Stream<R, E, O>) => Stream<R & R1 & HasClock, E | E1, E.Either<Q, P>> {
  return (stream) => aggregateAsyncWithinEither_(stream, transducer, schedule);
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
  schedule: Schedule<R1, ReadonlyArray<P>, Q>
): Stream<R & R1 & HasClock, E | E1, E.Either<Q, P>> {
  return pipe(
    M.do,
    M.bindS("pull", () => stream.proc),
    M.bindS("push", () => transducer.push),
    M.bindS("handoff", () => M.fromEffect(Ha.make<Take.Take<E, O>>())),
    M.bindS("raceNextTime", () => XR.makeManaged(false)),
    M.bindS("waitingFiber", () =>
      XR.makeManaged<O.Option<Fiber<never, Take.Take<E | E1, O>>>>(O.none())
    ),
    M.bindS("sdriver", () => M.fromEffect(Sc.driver(schedule))),
    M.bindS("lastChunk", () => XR.makeManaged<ReadonlyArray<P>>(A.empty())),
    M.letS("producer", ({ pull, handoff }) =>
      T.repeatWhileM_(Take.fromPull(pull), (take) =>
        pipe(
          Ha.offer(take)(handoff),
          T.as(() => Ex.isSuccess(take))
        )
      )
    ),
    M.letS("consumer", ({ push, handoff, raceNextTime, waitingFiber, sdriver, lastChunk }) => {
      const updateSchedule: T.RIO<R1 & HasClock, O.Option<Q>> = pipe(
        lastChunk.get,
        T.chain(sdriver.next),
        T.fold((_) => O.none(), O.some)
      );
      const waitForProducer: T.RIO<R1, Take.Take<E | E1, O>> = pipe(
        waitingFiber,
        XR.getAndSet(O.none()),
        T.chain(
          O.fold(
            () => Ha.take(handoff),
            (fiber) => Fi.join(fiber)
          )
        )
      );
      const updateLastChunk = (take: Take.Take<E1, P>): T.IO<void> =>
        Take.tap_(take, lastChunk.set);
      const handleTake = (
        take: Take.Take<E | E1, O>
      ): Pull.Pull<R1, E | E1, Take.Take<E1, E.Either<never, P>>> =>
        pipe(
          take,
          Take.foldM(
            () =>
              pipe(
                push(O.none()),
                T.map((ps) => [Take.chunk(A.map_(ps, E.right)), Take.end])
              ),
            T.halt,
            (os) =>
              T.chain_(Take.fromPull(T.asSomeError(push(O.some(os)))), (take) =>
                T.as_(updateLastChunk(take), () => [Take.map_(take, E.right)])
              )
          ),
          T.mapError(O.some)
        );
      const go = (
        race: boolean
      ): T.AIO<
        R & R1 & HasClock,
        O.Option<E | E1>,
        ReadonlyArray<Take.Take<E1, E.Either<Q, P>>>
      > => {
        if (!race) {
          return pipe(waitForProducer, T.chain(handleTake), T.apFirst(raceNextTime.set(true)));
        } else {
          return T.raceWith_(
            updateSchedule,
            waitForProducer,
            (scheduleDone, producerWaiting) =>
              pipe(
                T.done(scheduleDone),
                T.chain(
                  O.fold(
                    () =>
                      pipe(
                        T.do,
                        T.bindS("lastQ", () =>
                          pipe(
                            lastChunk.set(A.empty()),
                            T.andThen(T.orDie(sdriver.last)),
                            T.apFirst(sdriver.reset)
                          )
                        ),
                        T.letS(
                          "scheduleResult",
                          ({ lastQ }): Take.Take<E1, E.Either<Q, P>> => Ex.succeed([E.left(lastQ)])
                        ),
                        T.bindS("take", () =>
                          pipe(push(O.none()), T.asSomeError, Take.fromPull, T.tap(updateLastChunk))
                        ),
                        T.tap(() => raceNextTime.set(false)),
                        T.tap(() => waitingFiber.set(O.some(producerWaiting))),
                        T.map(({ take, scheduleResult }) => [
                          scheduleResult,
                          Take.map_(take, E.right)
                        ])
                      ),
                    (_) =>
                      pipe(
                        T.do,
                        T.bindS("ps", () =>
                          pipe(push(O.none()), T.asSomeError, Take.fromPull, T.tap(updateLastChunk))
                        ),
                        T.tap(() => raceNextTime.set(false)),
                        T.tap(() => waitingFiber.set(O.some(producerWaiting))),
                        T.map(({ ps }) => [Take.map_(ps, E.right)])
                      )
                  )
                )
              ),
            (producerDone, scheduleWaiting) =>
              T.apSecond_(Fi.interrupt(scheduleWaiting), handleTake(Ex.flatten(producerDone)))
          );
        }
      };

      return pipe(
        raceNextTime.get,
        T.chain(go),
        T.onInterrupt((_) =>
          pipe(waitingFiber.get, T.chain(flow(O.map(Fi.interrupt), O.getOrElse(T.unit))))
        )
      );
    }),
    M.tap(({ producer }) => T.forkManaged(producer)),
    M.map(({ consumer }) => consumer),
    (m) => new Stream(m),
    flattenTake
  );
}

/**
 * Uses `aggregateAsyncWithinEither` but only returns the `Right` results.
 */
export function aggregateAsyncWithin<O, R1, E1, P>(
  transducer: Transducer<R1, E1, O, P>,
  schedule: Schedule<R1, ReadonlyArray<P>, any>
): <R, E>(stream: Stream<R, E, O>) => Stream<R & R1 & HasClock, E | E1, P> {
  return (stream) => aggregateAsyncWithin_(stream, transducer, schedule);
}

/**
 * Uses `aggregateAsyncWithinEither` but only returns the `Right` results.
 */
export function aggregateAsyncWithin_<R, E, O, R1, E1, P>(
  stream: Stream<R, E, O>,
  transducer: Transducer<R1, E1, O, P>,
  schedule: Schedule<R1, ReadonlyArray<P>, any>
): Stream<R & R1 & HasClock, E | E1, P> {
  return filterMap_(
    aggregateAsyncWithinEither_(stream, transducer, schedule),
    E.fold(() => O.none(), O.some)
  );
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
  return (stream) => aggregateAsync_(stream, transducer);
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
  return aggregateAsyncWithin_(stream, transducer, Sc.forever);
}
