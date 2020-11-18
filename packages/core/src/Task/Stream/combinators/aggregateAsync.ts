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
import * as T from "../../Task";
import * as XR from "../../XRef";
import * as Ha from "../internal/Handoff";
import type * as Pull from "../internal/Pull";
import * as Take from "../internal/Take";
import { Stream } from "../model";
import type { Transducer } from "../Transducer/model";
import { filterMap_ } from "./filterMap";
import { flattenTake } from "./flattenTake";

export function aggregateAsyncWithinEither<O, R1, E1, P, Q>(
  transducer: Transducer<R1, E1, O, P>,
  schedule: Schedule<R1, ReadonlyArray<P>, Q>
): <R, E>(stream: Stream<R, E, O>) => Stream<R & R1 & HasClock, E | E1, E.Either<Q, P>> {
  return (stream) => aggregateAsyncWithinEither_(stream, transducer, schedule);
}

export function aggregateAsyncWithinEither_<R, E, O, R1, E1, P, Q>(
  stream: Stream<R, E, O>,
  transducer: Transducer<R1, E1, O, P>,
  schedule: Schedule<R1, ReadonlyArray<P>, Q>
): Stream<R & R1 & HasClock, E | E1, E.Either<Q, P>> {
  return pipe(
    M.do,
    M.bindS("pull", () => stream.proc),
    M.bindS("push", () => transducer.push),
    M.bindS("handoff", () => M.fromTask(Ha.make<Take.Take<E, O>>())),
    M.bindS("raceNextTime", () => XR.makeManagedRef(false)),
    M.bindS("waitingFiber", () =>
      XR.makeManagedRef<O.Option<Fiber<never, Take.Take<E | E1, O>>>>(O.none())
    ),
    M.bindS("sdriver", () => M.fromTask(Sc.driver(schedule))),
    M.bindS("lastChunk", () => XR.makeManagedRef<ReadonlyArray<P>>(A.empty())),
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
      ): T.Task<
        R & R1 & HasClock,
        O.Option<E | E1>,
        ReadonlyArray<Take.Take<E1, E.Either<Q, P>>>
      > => {
        if (!race) {
          return pipe(waitForProducer, T.chain(handleTake), T.apFirst(raceNextTime.set(true)));
        } else {
          return pipe(
            updateSchedule,
            T.raceWith(
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
                            ({ lastQ }): Take.Take<E1, E.Either<Q, P>> =>
                              Ex.succeed([E.left(lastQ)])
                          ),
                          T.bindS("take", () =>
                            pipe(
                              push(O.none()),
                              T.asSomeError,
                              Take.fromPull,
                              T.tap(updateLastChunk)
                            )
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
                            pipe(
                              push(O.none()),
                              T.asSomeError,
                              Take.fromPull,
                              T.tap(updateLastChunk)
                            )
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
            )
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

export function aggregateAsync_<R, E, O, R1, E1, P>(
  stream: Stream<R, E, O>,
  transducer: Transducer<R1, E1, O, P>
): Stream<R & R1 & HasClock, E | E1, P> {
  return aggregateAsyncWithin_(stream, transducer, Sc.forever);
}
