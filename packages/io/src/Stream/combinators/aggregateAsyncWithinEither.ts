import type { Chunk } from '../../Chunk'
import type { HasClock } from '../../Clock'
import type { Fiber } from '../../Fiber'
import type { Schedule } from '../../Schedule'
import type * as Pull from '../Pull'
import type { Transducer } from '../Transducer'

import * as E from '@principia/base/data/Either'
import { flow, pipe } from '@principia/base/data/Function'
import * as O from '@principia/base/data/Option'

import * as C from '../../Chunk'
import * as Ex from '../../Exit'
import * as Fi from '../../Fiber'
import * as I from '../../IO'
import * as XR from '../../IORef'
import * as M from '../../Managed'
import * as Sc from '../../Schedule'
import { Stream } from '../core'
import * as Ha from '../Handoff'
import * as Take from '../Take'
import { flattenTake } from './flattenTake'

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
  return pipe(
    M.do,
    M.bindS('pull', () => stream.proc),
    M.bindS('push', () => transducer.push),
    M.bindS('handoff', () => M.fromEffect(Ha.make<Take.Take<E, O>>())),
    M.bindS('raceNextTime', () => XR.makeManaged(false)),
    M.bindS('waitingFiber', () => XR.makeManaged<O.Option<Fiber<never, Take.Take<E | E1, O>>>>(O.none())),
    M.bindS('sdriver', () => M.fromEffect(Sc.driver(schedule))),
    M.bindS('lastChunk', () => XR.makeManaged<Chunk<P>>(C.empty())),
    M.letS('producer', ({ pull, handoff }) =>
      I.repeatWhileM_(Take.fromPull(pull), (take) =>
        pipe(
          Ha.offer(take)(handoff),
          I.as(() => Ex.isSuccess(take))
        )
      )
    ),
    M.letS('consumer', ({ push, handoff, raceNextTime, waitingFiber, sdriver, lastChunk }) => {
      const updateSchedule: I.URIO<R1 & HasClock, O.Option<Q>> = pipe(
        lastChunk.get,
        I.flatMap(sdriver.next),
        I.fold((_) => O.none(), O.some)
      )

      const waitForProducer: I.URIO<R1, Take.Take<E | E1, O>> = pipe(
        waitingFiber,
        XR.getAndSet(O.none()),
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
                      pipe(
                        I.do,
                        I.bindS('lastQ', () =>
                          pipe(lastChunk.set(C.empty()), I.andThen(I.orDie(sdriver.last)), I.apFirst(sdriver.reset))
                        ),
                        I.letS(
                          'scheduleResult',
                          ({ lastQ }): Take.Take<E1, E.Either<Q, P>> => Ex.succeed([E.left(lastQ)])
                        ),
                        I.bindS('take', () =>
                          pipe(push(O.none()), I.asSomeError, Take.fromPull, I.tap(updateLastChunk))
                        ),
                        I.tap(() => raceNextTime.set(false)),
                        I.tap(() => waitingFiber.set(O.some(producerWaiting))),
                        I.map(({ take, scheduleResult }) => [scheduleResult, Take.map_(take, E.right)])
                      ),
                    (_) =>
                      pipe(
                        I.do,
                        I.bindS('ps', () => pipe(push(O.none()), I.asSomeError, Take.fromPull, I.tap(updateLastChunk))),
                        I.tap(() => raceNextTime.set(false)),
                        I.tap(() => waitingFiber.set(O.some(producerWaiting))),
                        I.map(({ ps }) => [Take.map_(ps, E.right)])
                      )
                  )
                )
              ),
            (producerDone, scheduleWaiting) =>
              I.apSecond_(Fi.interrupt(scheduleWaiting), handleTake(Ex.flatten(producerDone)))
          )
        }
      }

      return pipe(
        raceNextTime.get,
        I.flatMap(go),
        I.onInterrupt((_) => pipe(waitingFiber.get, I.flatMap(flow(O.map(Fi.interrupt), O.getOrElse(I.unit)))))
      )
    }),
    M.tap(({ producer }) => I.forkManaged(producer)),
    M.map(({ consumer }) => consumer),
    (m) => new Stream(m),
    flattenTake
  )
}
