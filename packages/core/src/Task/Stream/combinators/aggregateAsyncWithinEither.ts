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
import type { Transducer } from "../internal/Transducer";
import { Stream } from "../model";
import { flattenTake } from "./flattenTake";

export const aggregateAsyncWithinEither_ = <R, E, O, R1, E1, P, Q>(
   stream: Stream<R, E, O>,
   transducer: Transducer<R1, E1, O, P>,
   schedule: Schedule<R1, ReadonlyArray<P>, Q>
): Stream<R & R1 & HasClock, E | E1, E.Either<Q, P>> =>
   flattenTake(
      new Stream(
         M.gen(function* (_) {
            const pull = yield* _(stream.proc);
            const push = yield* _(transducer.push);
            const handoff = yield* _(Ha.make<Take.Take<E, O>>());
            const raceNextTime = yield* _(XR.makeManagedRef(false));
            const waitingFiber = yield* _(XR.makeManagedRef<O.Option<Fiber<never, Take.Take<E | E1, O>>>>(O.none()));
            const sdriver = yield* _(Sc.driver(schedule));
            const lastChunk = yield* _(XR.makeManagedRef<ReadonlyArray<P>>(A.empty()));
            const producer = T.repeatWhileM_(Take.fromPull(pull), (take) =>
               pipe(Ha.offer(take)(handoff), T.as(Ex.isSuccess(take)))
            );

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

            const updateLastChunk = (take: Take.Take<E1, P>): T.IO<void> => Take.tap_(take, lastChunk.set);

            const handleTake = (take: Take.Take<E | E1, O>): Pull.Pull<R1, E | E1, Take.Take<E1, E.Either<never, P>>> =>
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
                           T.as_(updateLastChunk(take), [Take.map_(take, E.right)])
                        )
                  ),
                  T.mapError(O.some)
               );

            const go = (
               race: boolean
            ): T.Task<R & R1 & HasClock, O.Option<E | E1>, ReadonlyArray<Take.Take<E1, E.Either<Q, P>>>> => {
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
                                       T.gen(function* (_) {
                                          const lastQ = yield* _(
                                             pipe(
                                                lastChunk.set(A.empty()),
                                                T.apSecond(pipe(sdriver.last, T.orDie)),
                                                T.apFirst(sdriver.reset)
                                             )
                                          );
                                          const scheduleResult = Ex.succeed([E.left(lastQ)]);
                                          const take = yield* _(
                                             pipe(push(O.none()), T.asSomeError, Take.fromPull, T.tap(updateLastChunk))
                                          );
                                          yield* _(raceNextTime.set(false));
                                          yield* _(waitingFiber.set(O.some(producerWaiting)));
                                          return [scheduleResult, Take.map_(take, E.right)];
                                       }),
                                    (_) =>
                                       T.gen(function* (_) {
                                          const ps = yield* _(
                                             pipe(push(O.none()), T.asSomeError, Take.fromPull, T.tap(updateLastChunk))
                                          );
                                          yield* _(raceNextTime.set(false));
                                          yield* _(waitingFiber.set(O.some(producerWaiting)));
                                          return [Take.map_(ps, E.right)];
                                       })
                                 )
                              )
                           ),
                        (producerDone, scheduleWaiting) =>
                           T.apSecond_(Fi.interrupt(scheduleWaiting), handleTake(Ex.flatten(producerDone)))
                     )
                  );
               }
            };

            const consumer = pipe(
               raceNextTime.get,
               T.chain(go),
               T.onInterrupt((_) => pipe(waitingFiber.get, T.chain(flow(O.map(Fi.interrupt), O.getOrElse(T.unit)))))
            );

            yield* _(T.fork(producer));
            return consumer;
         })
      )
   );
