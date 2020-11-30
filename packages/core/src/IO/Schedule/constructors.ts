import { pipe } from "../../Function";
import { NoSuchElementException } from "../../GlobalExceptions";
import * as XR from "../../IORef/_core";
import type { Option } from "../../Option";
import * as O from "../../Option";
import * as I from "../_core";
import type { HasClock } from "../Clock";
import * as Clock from "../Clock";
import type { StepFunction } from "./Decision";
import { done } from "./Decision";
import { Schedule, ScheduleExecutor } from "./model";

export function makeExecutor<R, I, O>(
  next: (input: I) => I.IO<R, Option<never>, O>,
  last: I.FIO<Error, O>,
  reset: I.UIO<void>
): ScheduleExecutor<R, I, O> {
  return new ScheduleExecutor(next, last, reset);
}

export function makeSchedule<R, I, O>(step: StepFunction<R, I, O>): Schedule<R, I, O> {
  return new Schedule(step);
}

export function driver<R, I, O>(
  schedule: Schedule<R, I, O>
): I.UIO<ScheduleExecutor<HasClock & R, I, O>> {
  return pipe(
    XR.make([O.none<O>(), schedule.step] as const),
    I.map((ref) => {
      const reset = ref.set([O.none(), schedule.step]);

      const last = pipe(
        ref.get,
        I.chain(([o, _]) =>
          O.fold_(
            o,
            () => I.fail(new NoSuchElementException("ScheduleExecutor.last")),
            (b) => I.pure(b)
          )
        )
      );

      const next = (input: I) =>
        pipe(
          I.do,
          I.bindS("step", () => I.map_(ref.get, ([_, o]) => o)),
          I.bindS("now", () => Clock.currentTime),
          I.bindS("dec", ({ now, step }) => step(now, input)),
          I.bindS("v", ({ dec, now }) => {
            switch (dec._tag) {
              case "Done":
                return pipe(
                  ref.set([O.some(dec.out), done(dec.out)]),
                  I.chain(() => I.fail(O.none()))
                );
              case "Continue":
                return pipe(
                  ref.set([O.some(dec.out), dec.next]),
                  I.map(() => dec.interval - now),
                  I.chain((s) => (s > 0 ? Clock.sleep(s) : I.unit())),
                  I.map(() => dec.out)
                );
            }
          }),
          I.map(({ v }) => v)
        );

      return new ScheduleExecutor(next, last, reset);
    })
  );
}
