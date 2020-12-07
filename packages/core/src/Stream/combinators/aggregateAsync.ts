import { flow, pipe } from "@principia/prelude";

import type { Chunk } from "../../Chunk";
import * as C from "../../Chunk";
import * as E from "../../Either";
import * as I from "../../IO";
import type { HasClock } from "../../IO/Clock";
import * as Ex from "../../IO/Exit";
import type { Fiber } from "../../IO/Fiber";
import * as Fi from "../../IO/Fiber";
import type { Schedule } from "../../IO/Schedule";
import * as Sc from "../../IO/Schedule";
import * as XR from "../../IORef";
import * as M from "../../Managed";
import * as O from "../../Option";
import * as Ha from "../Handoff";
import { Stream } from "../model";
import type * as Pull from "../Pull";
import * as Take from "../Take";
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
  schedule: Schedule<R1, Chunk<P>, Q>
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
  schedule: Schedule<R1, Chunk<P>, Q>
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
    M.bindS("lastChunk", () => XR.makeManaged<Chunk<P>>(C.empty())),
    M.letS("producer", ({ pull, handoff }) =>
      I.repeatWhileM_(Take.fromPull(pull), (take) =>
        pipe(
          Ha.offer(take)(handoff),
          I.as(() => Ex.isSuccess(take))
        )
      )
    ),
    M.letS("consumer", ({ push, handoff, raceNextTime, waitingFiber, sdriver, lastChunk }) => {
      const updateSchedule: I.URIO<R1 & HasClock, O.Option<Q>> = pipe(
        lastChunk.get,
        I.chain(sdriver.next),
        I.fold((_) => O.none(), O.some)
      );
      const waitForProducer: I.URIO<R1, Take.Take<E | E1, O>> = pipe(
        waitingFiber,
        XR.getAndSet(O.none()),
        I.chain(
          O.fold(
            () => Ha.take(handoff),
            (fiber) => Fi.join(fiber)
          )
        )
      );
      const updateLastChunk = (take: Take.Take<E1, P>): I.UIO<void> =>
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
                I.map((ps) => [Take.chunk(C.map_(ps, E.right)), Take.end])
              ),
            I.halt,
            (os) =>
              I.chain_(Take.fromPull(I.asSomeError(push(O.some(os)))), (take) =>
                I.as_(updateLastChunk(take), () => [Take.map_(take, E.right)])
              )
          ),
          I.mapError(O.some)
        );
      const go = (
        race: boolean
      ): I.IO<R & R1 & HasClock, O.Option<E | E1>, Chunk<Take.Take<E1, E.Either<Q, P>>>> => {
        if (!race) {
          return pipe(waitForProducer, I.chain(handleTake), I.apFirst(raceNextTime.set(true)));
        } else {
          return I.raceWith_(
            updateSchedule,
            waitForProducer,
            (scheduleDone, producerWaiting) =>
              pipe(
                I.done(scheduleDone),
                I.chain(
                  O.fold(
                    () =>
                      pipe(
                        I.do,
                        I.bindS("lastQ", () =>
                          pipe(
                            lastChunk.set(C.empty()),
                            I.andThen(I.orDie(sdriver.last)),
                            I.apFirst(sdriver.reset)
                          )
                        ),
                        I.letS(
                          "scheduleResult",
                          ({ lastQ }): Take.Take<E1, E.Either<Q, P>> => Ex.succeed([E.left(lastQ)])
                        ),
                        I.bindS("take", () =>
                          pipe(push(O.none()), I.asSomeError, Take.fromPull, I.tap(updateLastChunk))
                        ),
                        I.tap(() => raceNextTime.set(false)),
                        I.tap(() => waitingFiber.set(O.some(producerWaiting))),
                        I.map(({ take, scheduleResult }) => [
                          scheduleResult,
                          Take.map_(take, E.right)
                        ])
                      ),
                    (_) =>
                      pipe(
                        I.do,
                        I.bindS("ps", () =>
                          pipe(push(O.none()), I.asSomeError, Take.fromPull, I.tap(updateLastChunk))
                        ),
                        I.tap(() => raceNextTime.set(false)),
                        I.tap(() => waitingFiber.set(O.some(producerWaiting))),
                        I.map(({ ps }) => [Take.map_(ps, E.right)])
                      )
                  )
                )
              ),
            (producerDone, scheduleWaiting) =>
              I.apSecond_(Fi.interrupt(scheduleWaiting), handleTake(Ex.flatten(producerDone)))
          );
        }
      };

      return pipe(
        raceNextTime.get,
        I.chain(go),
        I.onInterrupt((_) =>
          pipe(waitingFiber.get, I.chain(flow(O.map(Fi.interrupt), O.getOrElse(I.unit))))
        )
      );
    }),
    M.tap(({ producer }) => I.forkManaged(producer)),
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
  schedule: Schedule<R1, Chunk<P>, any>
): <R, E>(stream: Stream<R, E, O>) => Stream<R & R1 & HasClock, E | E1, P> {
  return (stream) => aggregateAsyncWithin_(stream, transducer, schedule);
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
