import { pipe } from "../../Function";
import { NoSuchElementException } from "../../GlobalExceptions";
import type { Option } from "../../Option";
import * as O from "../../Option";
import type { HasClock } from "../Clock";
import * as Clock from "../Clock";
import * as T from "../Task/core";
import * as XR from "../XRef/combinators";
import type { StepFunction } from "./Decision";
import { done } from "./Decision";
import type { Schedule, ScheduleExecutor } from "./model";

export const makeExecutor = <R, I, O>(
   next: (input: I) => T.Task<R, Option<never>, O>,
   last: T.EIO<Error, O>,
   reset: T.IO<void>
): ScheduleExecutor<R, I, O> => ({
   next,
   last,
   reset
});

export const makeSchedule = <R, I, O>(step: StepFunction<R, I, O>): Schedule<R, I, O> => ({
   step
});

export const driver = <R, I, O>(schedule: Schedule<R, I, O>): T.IO<ScheduleExecutor<HasClock & R, I, O>> =>
   pipe(
      XR.makeRef([O.none<O>(), schedule.step] as const),
      T.map((ref) => {
         const reset = ref.set([O.none(), schedule.step]);

         const last = pipe(
            ref.get,
            T.chain(([o, _]) =>
               O.fold_(
                  o,
                  () => T.fail(new NoSuchElementException("ScheduleExecutor.last")),
                  (b) => T.pure(b)
               )
            )
         );

         const next = (input: I) =>
            pipe(
               T.of,
               T.bindS("step", () => T.map_(ref.get, ([_, o]) => o)),
               T.bindS("now", () => Clock.currentTime),
               T.bindS("dec", ({ now, step }) => step(now, input)),
               T.bindS("v", ({ dec, now }) => {
                  switch (dec._tag) {
                     case "Done":
                        return pipe(
                           ref.set([O.some(dec.out), done(dec.out)]),
                           T.chain(() => T.fail(O.none()))
                        );
                     case "Continue":
                        return pipe(
                           ref.set([O.some(dec.out), dec.next]),
                           T.map(() => dec.interval - now),
                           T.chain((s) => (s > 0 ? Clock.sleep(s) : T.unit)),
                           T.map(() => dec.out)
                        );
                  }
               }),
               T.map(({ v }) => v)
            );

         return makeExecutor(next, last, reset);
      })
   );
