import { pipe } from "@principia/core/Function";
import { Maybe } from "@principia/core/Maybe";
import * as Mb from "@principia/core/Maybe";

import { HasClock } from "../Clock";
import * as Clock from "../Clock";
import * as T from "../Effect/core";
import { NoSuchElementException } from "../GlobalExceptions";
import * as XR from "../XRef/combinators";
import { done, StepFunction } from "./Decision";
import { Schedule, ScheduleDriver } from "./Schedule";

export const makeDriver = <R, I, O>(
   next: (input: I) => T.Effect<R, Maybe<never>, O>,
   last: T.IO<Error, O>,
   reset: T.UIO<void>
): ScheduleDriver<R, I, O> => ({
   next,
   last,
   reset
});

export const makeSchedule = <R, I, O>(step: StepFunction<R, I, O>): Schedule<R, I, O> => ({
   step
});

export const driver = <R, I, O>(
   schedule: Schedule<R, I, O>
): T.UIO<ScheduleDriver<HasClock & R, I, O>> =>
   pipe(
      XR.makeRef([Mb.nothing<O>(), schedule.step] as const),
      T.map((ref) => {
         const reset = ref.set([Mb.nothing(), schedule.step]);

         const last = pipe(
            ref.get,
            T.chain(([o, _]) =>
               Mb._fold(
                  o,
                  () => T.fail(new NoSuchElementException("ScheduleDriver.last")),
                  (b) => T.pure(b)
               )
            )
         );

         const next = (input: I) =>
            pipe(
               T.of,
               T.bindS("step", () => T._map(ref.get, ([_, o]) => o)),
               T.bindS("now", () => Clock.currentTime),
               T.bindS("dec", ({ now, step }) => step(now, input)),
               T.bindS("v", ({ dec, now }) => {
                  switch (dec._tag) {
                     case "Done":
                        return pipe(
                           ref.set([Mb.just(dec.out), done(dec.out)]),
                           T.chain(() => T.fail(Mb.nothing()))
                        );
                     case "Continue":
                        return pipe(
                           ref.set([Mb.just(dec.out), dec.next]),
                           T.map(() => dec.interval - now),
                           T.chain((s) => (s > 0 ? Clock.sleep(s) : T.unit)),
                           T.map(() => dec.out)
                        );
                  }
               }),
               T.map(({ v }) => v)
            );

         return makeDriver(next, last, reset);
      })
   );
