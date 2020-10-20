import type { Either } from "@principia/core/Either";
import * as E from "@principia/core/Either";
import { constant, pipe, tuple } from "@principia/core/Function";
import type { Option } from "@principia/core/Option";
import * as O from "@principia/core/Option";

import * as T from "../Effect/core";
import { nextDouble } from "../Random";
import { makeSchedule } from "./constructors";
import type { Decision, StepFunction } from "./Decision";
import { makeContinue, makeDone } from "./Decision";
import type { Schedule } from "./Schedule";

const repeatLoop = <R, I, O>(
   init: StepFunction<R, I, O>,
   self: StepFunction<R, I, O> = init
): StepFunction<R, I, O> => (now, i) =>
   T.chain_(self(now, i), (d) => {
      switch (d._tag) {
         case "Done": {
            return repeatLoop(init, self)(now, i);
         }
         case "Continue": {
            return T.pure(makeContinue(d.out, d.interval, repeatLoop(init, d.next)));
         }
      }
   });

const modifyDelayMLoop = <R, I, O, R1>(
   sf: StepFunction<R, I, O>,
   f: (o: O, d: number) => T.Effect<R1, never, number>
): StepFunction<R & R1, I, O> => (now, i) =>
   T.chain_(sf(now, i), (d) => {
      switch (d._tag) {
         case "Done": {
            return T.pure<Decision<R & R1, I, O>>(makeDone(d.out));
         }
         case "Continue": {
            const delay = d.interval - now;

            return T.map_(f(d.out, delay), (n) => makeContinue(d.out, d.interval + n, modifyDelayMLoop(d.next, f)));
         }
      }
   });

/**
 * Returns a new schedule that loops this one continuously, resetting the state
 * when this schedule is done.
 */
export const repeat = <R, I, O>(sc: Schedule<R, I, O>): Schedule<R, I, O> => makeSchedule(repeatLoop(sc.step));

export const modifyDelayM_ = <R, I, O, R1>(
   sc: Schedule<R, I, O>,
   f: (o: O, d: number) => T.Effect<R1, never, number>
): Schedule<R & R1, I, O> => makeSchedule(modifyDelayMLoop(sc.step, f));

export const modifyDelayM = <R1, O>(f: (o: O, d: number) => T.Effect<R1, never, number>) => <R, I>(
   sc: Schedule<R, I, O>
): Schedule<R & R1, I, O> => modifyDelayM_(sc, f);

export const modifyDelay_ = <R, I, O>(sc: Schedule<R, I, O>, f: (o: O, d: number) => number): Schedule<R, I, O> =>
   modifyDelayM_(sc, (o, d) => T.pure(f(o, d)));

export const modifyDelay = <O>(f: (o: O, d: number) => number) => <R, I>(sc: Schedule<R, I, O>): Schedule<R, I, O> =>
   modifyDelay_(sc, f);

/**
 * Returns a new schedule with the effectfully calculated delay added to every update.
 */
export const addDelayM_ = <R, I, O, R1>(
   sc: Schedule<R, I, O>,
   f: (o: O) => T.Effect<R1, never, number>
): Schedule<R & R1, I, O> => modifyDelayM_(sc, (o, d) => T.map_(f(o), (i) => i + d));

/**
 * Returns a new schedule with the effectfully calculated delay added to every update.
 */
export const addDelayM = <R1, O>(f: (o: O) => T.Effect<R1, never, number>) => <R, I>(
   sc: Schedule<R, I, O>
): Schedule<R & R1, I, O> => addDelayM_(sc, f);

/**
 * Returns a new schedule with the given delay added to every update.
 */
export const addDelay_ = <R, I, O>(sc: Schedule<R, I, O>, f: (o: O) => number) => addDelayM_(sc, (o) => T.pure(f(o)));

/**
 * Returns a new schedule with the given delay added to every update.
 */
export const addDelay = <O>(f: (o: O) => number) => <R, I>(sc: Schedule<R, I, O>) => addDelay_(sc, f);

/**
 * Returns a new `Schedule` with the specified effectfully computed delay added before the start
 * of each interval produced by the this `Schedule`.
 */
export const delayedM_ = <R, I, O, R1>(sc: Schedule<R, I, O>, f: (d: number) => T.Effect<R1, never, number>) =>
   modifyDelayM_(sc, (_, d) => f(d));

/**
 * Returns a new `Schedule` with the specified effectfully computed delay added before the start
 * of each interval produced by the this `Schedule`.
 */
export const delayedM = <R1>(f: (d: number) => T.Effect<R1, never, number>) => <R, I, O>(sc: Schedule<R, I, O>) =>
   delayedM_(sc, f);

/**
 * Returns a new schedule with the specified computed delay added before the start
 * of each interval produced by this schedule.
 */
export const delayed_ = <R, I, O>(sc: Schedule<R, I, O>, f: (d: number) => number) =>
   delayedM_(sc, (d) => T.pure(f(d)));

/**
 * Returns a new schedule with the specified computed delay added before the start
 * of each interval produced by this schedule.
 */
export const delayed = (f: (d: number) => number) => <R, I, O>(sc: Schedule<R, I, O>) => delayed_(sc, f);

export const duration = (n: number) =>
   makeSchedule((now, _: unknown) => T.pure(makeContinue(0, now + n, () => T.pure(makeDone(n)))));

/**
 * Returns a new schedule with the specified computed delay added before the start
 * of each interval produced by this schedule.
 */
export const delayedFrom = <R, I>(sc: Schedule<R, I, number>) => addDelay_(sc, (x) => x);

const andThenEitherLoop = <R, I, O, R1, I1, O1>(
   sc: StepFunction<R, I, O>,
   that: StepFunction<R1, I1, O1>,
   onLeft: boolean
): StepFunction<R & R1, I & I1, Either<O, O1>> => (now, i) =>
   onLeft
      ? T.chain_(sc(now, i), (d) => {
           switch (d._tag) {
              case "Continue": {
                 return T.pure(makeContinue(E.left(d.out), d.interval, andThenEitherLoop(d.next, that, true)));
              }
              case "Done": {
                 return andThenEitherLoop(sc, that, false)(now, i);
              }
           }
        })
      : T.map_(that(now, i), (d) => {
           switch (d._tag) {
              case "Done": {
                 return makeDone(E.right(d.out));
              }
              case "Continue": {
                 return makeContinue(E.right(d.out), d.interval, andThenEitherLoop(sc, d.next, false));
              }
           }
        });

/**
 * Returns a new schedule that first executes this schedule to completion, and then executes the
 * specified schedule to completion.
 */
export const andThenEither_ = <R, I, O, R1, I1, O1>(sc: Schedule<R, I, O>, that: Schedule<R1, I1, O1>) =>
   makeSchedule(andThenEitherLoop(sc.step, that.step, true));

/**
 * Returns a new schedule that first executes this schedule to completion, and then executes the
 * specified schedule to completion.
 */
export const andThenEither = <R1, I1, O1>(that: Schedule<R1, I1, O1>) => <R, I, O>(sc: Schedule<R, I, O>) =>
   andThenEither_(sc, that);

const mapMLoop = <R, I, O, R1, O1>(
   self: StepFunction<R, I, O>,
   f: (o: O) => T.Effect<R1, never, O1>
): StepFunction<R & R1, I, O1> => (now, i) =>
   T.chain_(self(now, i), (d) => {
      switch (d._tag) {
         case "Done": {
            return T.map_(f(d.out), (o): Decision<R & R1, I, O1> => makeDone(o));
         }
         case "Continue": {
            return T.map_(f(d.out), (o) => makeContinue(o, d.interval, mapMLoop(d.next, f)));
         }
      }
   });

export const mapM_ = <R, I, O, R1, O1>(sc: Schedule<R, I, O>, f: (o: O) => T.Effect<R1, never, O1>) =>
   makeSchedule(mapMLoop(sc.step, (o) => f(o)));

export const mapM = <R1, O, O1>(f: (o: O) => T.Effect<R1, never, O1>) => <R, I>(sc: Schedule<R, I, O>) => mapM_(sc, f);

export const map_ = <R, I, A, B>(fa: Schedule<R, I, A>, f: (a: A) => B): Schedule<R, I, B> =>
   mapM_(fa, (o) => T.pure(f(o)));

export const map = <A, B>(f: (a: A) => B) => <R, I>(fa: Schedule<R, I, A>): Schedule<R, I, B> => map_(fa, f);

export const as_ = <R, I, O, O1>(sc: Schedule<R, I, O>, o: O1) => map_(sc, () => o);

export const as = <O1>(o: O1) => <R, I, O>(sc: Schedule<R, I, O>) => as_(sc, o);

/**
 * Returns a new schedule that maps the output of this schedule to unit.
 */
export const unit = <R, I, O, R1>(sc: Schedule<R, I, O>): Schedule<R & R1, I, void> => as<void>(undefined)(sc);

const combineWithLoop = <R, I, O, R1, I1, O1>(
   sc: StepFunction<R, I, O>,
   that: StepFunction<R1, I1, O1>,
   f: (d1: number, d2: number) => number
): StepFunction<R & R1, I & I1, [O, O1]> => (now, i) => {
   const left = sc(now, i);
   const right = that(now, i);

   return T.map_(T.both_(left, right), ([l, r]) => {
      switch (l._tag) {
         case "Done": {
            switch (r._tag) {
               case "Done": {
                  return makeDone<[O, O1]>([l.out, r.out]);
               }
               case "Continue": {
                  return makeDone<[O, O1]>([l.out, r.out]);
               }
            }
         }
         /* eslint-disable-next-line no-fallthrough */
         case "Continue": {
            switch (r._tag) {
               case "Done": {
                  return makeDone<[O, O1]>([l.out, r.out]);
               }
               case "Continue": {
                  return makeContinue([l.out, r.out], f(l.interval, r.interval), combineWithLoop(l.next, r.next, f));
               }
            }
         }
      }
   });
};

export const combineWith_ = <R, I, O, R1, I1, O1>(
   sc: Schedule<R, I, O>,
   that: Schedule<R1, I1, O1>,
   f: (d1: number, d2: number) => number
) => makeSchedule(combineWithLoop(sc.step, that.step, f));

export const combineWith = <R1, I1, O1>(that: Schedule<R1, I1, O1>) => (f: (d1: number, d2: number) => number) => <
   R,
   I,
   O
>(
   sc: Schedule<R, I, O>
) => combineWith_(sc, that, f);

export const either_ = <R, I, O, R1, I1, O1>(sc: Schedule<R, I, O>, that: Schedule<R1, I1, O1>) =>
   combineWith_(sc, that, (d1, d2) => Math.min(d1, d2));

export const either = <R1, I1, O1>(that: Schedule<R1, I1, O1>) => <R, I, O>(sc: Schedule<R, I, O>) => either_(sc, that);

export const eitherWith_ = <R, I, O, R1, I1, O1, O2>(
   sc: Schedule<R, I, O>,
   that: Schedule<R1, I1, O1>,
   f: (o: O, o1: O1) => O2
) => map_(either_(sc, that), ([o, o1]) => f(o, o1));

export const eitherWith = <R1, I1, O1>(that: Schedule<R1, I1, O1>) => <O, O2>(f: (o: O, o1: O1) => O2) => <R, I>(
   sc: Schedule<R, I, O>
) => eitherWith_(sc, that, f);

const bothLoop = <R, I, O, R1, I1, O1>(
   sc: StepFunction<R, I, O>,
   that: StepFunction<R1, I1, O1>
): StepFunction<R & R1, readonly [I, I1], readonly [O, O1]> => (now, [in1, in2]) =>
   T.map_(T.both_(sc(now, in1), that(now, in2)), ([d1, d2]) => {
      switch (d1._tag) {
         case "Done": {
            switch (d2._tag) {
               case "Done": {
                  return makeDone(tuple(d1.out, d2.out));
               }
               case "Continue": {
                  return makeDone(tuple(d1.out, d2.out));
               }
            }
         }
         /* eslint-disable-next-line no-fallthrough */
         case "Continue": {
            switch (d2._tag) {
               case "Done": {
                  return makeDone(tuple(d1.out, d2.out));
               }
               case "Continue": {
                  return makeContinue(
                     tuple(d1.out, d2.out),
                     Math.min(d1.interval, d2.interval),
                     bothLoop(d1.next, d2.next)
                  );
               }
            }
         }
      }
   });

/**
 * Returns a new schedule that has both the inputs and outputs of this and the specified
 * schedule.
 */
export const bothInOut_ = <R, I, O, R1, I1, O1>(sc: Schedule<R, I, O>, that: Schedule<R1, I1, O1>) =>
   makeSchedule(bothLoop(sc.step, that.step));

/**
 * Returns a new schedule that has both the inputs and outputs of this and the specified
 * schedule.
 */
export const bothInOut = <R1, I1, O1>(that: Schedule<R1, I1, O1>) => <R, I, O>(sc: Schedule<R, I, O>) =>
   bothInOut_(sc, that);

/**
 * Returns a new schedule that performs a geometric intersection on the intervals defined
 * by both schedules.
 */
export const both_ = <R, I, O, R1, I1, O1>(sc: Schedule<R, I, O>, that: Schedule<R1, I1, O1>) =>
   combineWith_(sc, that, (l, r) => Math.max(l, r));

/**
 * Returns a new schedule that performs a geometric intersection on the intervals defined
 * by both schedules.
 */
export const both = <R1, I1, O1>(that: Schedule<R1, I1, O1>) => <R, I, O>(
   self: Schedule<R, I, O>
): Schedule<R & R1, I & I1, readonly [O, O1]> => both_(self, that);

const checkMLoop = <R, I, O, R1>(
   self: StepFunction<R, I, O>,
   test: (i: I, o: O) => T.Effect<R1, never, boolean>
): StepFunction<R & R1, I, O> => (now, i) =>
   T.chain_(self(now, i), (d) => {
      switch (d._tag) {
         case "Done": {
            return T.pure(makeDone(d.out));
         }
         case "Continue": {
            return T.map_(test(i, d.out), (b) =>
               b ? makeContinue(d.out, d.interval, checkMLoop(d.next, test)) : makeDone(d.out)
            );
         }
      }
   });

/**
 * Returns a new schedule that passes each input and output of this schedule to the specified
 * function, and then determines whether or not to continue based on the return value of the
 * function.
 */
export const checkM_ = <R, I, O, R1>(sc: Schedule<R, I, O>, test: (i: I, o: O) => T.Effect<R1, never, boolean>) =>
   makeSchedule(checkMLoop(sc.step, test));

/**
 * Returns a new schedule that passes each input and output of this schedule to the specified
 * function, and then determines whether or not to continue based on the return value of the
 * function.
 */
export const checkM = <R1, I, O>(test: (i: I, o: O) => T.Effect<R1, never, boolean>) => <R>(sc: Schedule<R, I, O>) =>
   checkM_(sc, test);

/**
 * Returns a new schedule that passes each input and output of this schedule to the spefcified
 * function, and then determines whether or not to continue based on the return value of the
 * function.
 */
export const check_ = <R, I, O>(sc: Schedule<R, I, O>, test: (i: I, o: O) => boolean) =>
   checkM_(sc, (i, o) => T.pure(test(i, o)));

/**
 * Returns a new schedule that passes each input and output of this schedule to the spefcified
 * function, and then determines whether or not to continue based on the return value of the
 * function.
 */
export const check = <I, O>(test: (i: I, o: O) => boolean) => <R>(sc: Schedule<R, I, O>) => check_(sc, test);

/**
 * Returns a new schedule that continues until the specified predicate on the input evaluates
 * to true.
 */
export const untilInput_ = <R, I, O>(sc: Schedule<R, I, O>, f: (i: I) => boolean) => check_(sc, (i) => !f(i));

/**
 * Returns a new schedule that continues until the specified predicate on the input evaluates
 * to true.
 */
export const untilInput = <I>(f: (i: I) => boolean) => <R, O>(sc: Schedule<R, I, O>) => untilInput_(sc, f);

/**
 * Returns a new schedule that continues until the specified predicate on the input evaluates
 * to true.
 */
export const untilInputM_ = <R, I, O, R1>(sc: Schedule<R, I, O>, f: (i: I) => T.Effect<R1, never, boolean>) =>
   checkM_(sc, (i) => T.map_(f(i), (b) => !b));

/**
 * Returns a new schedule that continues until the specified predicate on the input evaluates
 * to true.
 */
export const untilInputM = <R1, I>(f: (i: I) => T.Effect<R1, never, boolean>) => <R, O>(sc: Schedule<R, I, O>) =>
   untilInputM_(sc, f);

/**
 * Returns a new schedule that continues until the specified predicate on the input evaluates
 * to true.
 */
export const untilOutput_ = <R, I, O>(sc: Schedule<R, I, O>, f: (o: O) => boolean) => check_(sc, (_, o) => !f(o));

/**
 * Returns a new schedule that continues until the specified predicate on the input evaluates
 * to true.
 */
export const untilOutput = <O>(f: (o: O) => boolean) => <R, I>(sc: Schedule<R, I, O>) => untilOutput_(sc, f);

/**
 * Returns a new schedule that continues until the specified predicate on the input evaluates
 * to true.
 */
export const untilOutputM_ = <R, I, O, R1>(sc: Schedule<R, I, O>, f: (o: O) => T.Effect<R1, never, boolean>) =>
   checkM_(sc, (_, o) => T.map_(f(o), (b) => !b));

/**
 * Returns a new schedule that continues until the specified predicate on the input evaluates
 * to true.
 */
export const untilOutputM = <R1, O>(f: (o: O) => T.Effect<R1, never, boolean>) => <R, I>(sc: Schedule<R, I, O>) =>
   untilOutputM_(sc, f);

/**
 * Returns a new schedule that continues for as long the specified effectful predicate on the
 * input evaluates to true.
 */
export const whileInput_ = <R, I, O>(sc: Schedule<R, I, O>, f: (i: I) => boolean) => check_(sc, (i) => f(i));

/**
 * Returns a new schedule that continues for as long the specified effectful predicate on the
 * input evaluates to true.
 */
export const whileInput = <I>(f: (i: I) => boolean) => <R, O>(sc: Schedule<R, I, O>) => whileInput_(sc, f);

/**
 * Returns a new schedule that continues for as long the specified effectful predicate on the
 * input evaluates to true.
 */
export const whileInputM_ = <R, I, O, R1>(sc: Schedule<R, I, O>, f: (i: I) => T.Effect<R1, never, boolean>) =>
   checkM_(sc, (i) => f(i));

/**
 * Returns a new schedule that continues for as long the specified effectful predicate on the
 * input evaluates to true.
 */
export const whileInputM = <R1, I>(f: (i: I) => T.Effect<R1, never, boolean>) => <R, O>(sc: Schedule<R, I, O>) =>
   whileInputM_(sc, f);

/**
 * Returns a new schedule that continues for as long the specified effectful predicate on the
 * input evaluates to true.
 */
export const whileOutput_ = <R, I, O>(sc: Schedule<R, I, O>, f: (o: O) => boolean) => check_(sc, (_, o) => f(o));

/**
 * Returns a new schedule that continues for as long the specified effectful predicate on the
 * input evaluates to true.
 */
export const whileOutput = <O>(f: (o: O) => boolean) => <R, I>(sc: Schedule<R, I, O>) => whileOutput_(sc, f);

/**
 * Returns a new schedule that continues for as long the specified effectful predicate on the
 * input evaluates to true.
 */
export const whileOutputM_ = <R, I, O, R1>(sc: Schedule<R, I, O>, f: (o: O) => T.Effect<R1, never, boolean>) =>
   checkM_(sc, (_, o) => f(o));

/**
 * Returns a new schedule that continues for as long the specified effectful predicate on the
 * input evaluates to true.
 */
export const whileOutputM = <R1, O>(f: (o: O) => T.Effect<R1, never, boolean>) => <R, I>(sc: Schedule<R, I, O>) =>
   whileOutputM_(sc, f);

const chooseLoop = <R, I, O, R1, I1, O1>(
   sc: StepFunction<R, I, O>,
   that: StepFunction<R1, I1, O1>
): StepFunction<R & R1, Either<I, I1>, Either<O, O1>> => (now, either) =>
   E.fold_(
      either,
      (i) =>
         T.map_(sc(now, i), (d) => {
            switch (d._tag) {
               case "Done": {
                  return makeDone(E.left(d.out));
               }
               case "Continue": {
                  return makeContinue(E.left(d.out), d.interval, chooseLoop(d.next, that));
               }
            }
         }),
      (i2) =>
         T.map_(that(now, i2), (d) => {
            switch (d._tag) {
               case "Done": {
                  return makeDone(E.right(d.out));
               }
               case "Continue": {
                  return makeContinue(E.right(d.out), d.interval, chooseLoop(sc, d.next));
               }
            }
         })
   );

/**
 * Returns a new schedule that allows choosing between feeding inputs to this schedule, or
 * feeding inputs to the specified schedule.
 */
export const choose_ = <R, I, O, R1, I1, O1>(sc: Schedule<R, I, O>, that: Schedule<R1, I1, O1>) =>
   makeSchedule(chooseLoop(sc.step, that.step));

/**
 * Returns a new schedule that allows choosing between feeding inputs to this schedule, or
 * feeding inputs to the specified schedule.
 */
export const choose = <R1, I1, O1>(that: Schedule<R1, I1, O1>) => <R, I, O>(sc: Schedule<R, I, O>) => choose_(sc, that);

/**
 * Returns a new schedule that allows choosing between feeding inputs to this schedule, or
 * feeding inputs to the specified schedule.
 */
export const chooseMerge_ = <R, I, O, R1, I1, O1>(sc: Schedule<R, I, O>, that: Schedule<R1, I1, O1>) =>
   map_(choose_(sc, that), E.merge);

/**
 * Returns a new schedule that allows choosing between feeding inputs to this schedule, or
 * feeding inputs to the specified schedule.
 */
export const chooseMerge = <R1, I1, O1>(that: Schedule<R1, I1, O1>) => <R, I, O>(sc: Schedule<R, I, O>) =>
   chooseMerge_(sc, that);

const ensuringLoop = <R, I, O, R1>(
   self: StepFunction<R, I, O>,
   finalizer: T.Effect<R1, never, any>
): StepFunction<R & R1, I, O> => (now, i) =>
   T.chain_(self(now, i), (d) => {
      switch (d._tag) {
         case "Done": {
            return T.as_(finalizer, makeDone(d.out));
         }
         case "Continue": {
            return T.pure(makeContinue(d.out, d.interval, ensuringLoop(d.next, finalizer)));
         }
      }
   });

/**
 * Returns a new schedule that will run the specified finalizer as soon as the schedule is
 * complete. Note that unlike `Effect#ensuring`, this method does not guarantee the finalizer
 * will be run. The `Schedule` may not initialize or the driver of the schedule may not run
 * to completion. However, if the `Schedule` ever decides not to continue, then the
 * finalizer will be run.
 */
export const ensuring_ = <R, I, O, R1>(sc: Schedule<R, I, O>, finalizer: T.Effect<R1, never, any>) =>
   makeSchedule(ensuringLoop(sc.step, finalizer));

/**
 * Returns a new schedule that will run the specified finalizer as soon as the schedule is
 * complete. Note that unlike `Effect#ensuring`, this method does not guarantee the finalizer
 * will be run. The `Schedule` may not initialize or the driver of the schedule may not run
 * to completion. However, if the `Schedule` ever decides not to continue, then the
 * finalizer will be run.
 */
export const ensuring = <R1>(finalizer: T.Effect<R1, never, any>) => <R, I, O>(sc: Schedule<R, I, O>) =>
   ensuring_(sc, finalizer);

/**
 * A schedule that recurs on a fixed interval. Returns the number of
 * repetitions of the schedule so far.
 *
 * If the action run between updates takes longer than the interval, then the
 * action will be run immediately, but re-runs will not "pile up".
 *
 * <pre>
 * |-----interval-----|-----interval-----|-----interval-----|
 * |---------action--------||action|-----|action|-----------|
 * </pre>
 */
export const fixed = (interval: number): Schedule<unknown, unknown, number> => {
   type State = { startMillis: number; lastRun: number };

   const loop = (startMillis: Option<State>, n: number): StepFunction<unknown, unknown, number> => (now, _) =>
      T.pure(
         O.fold_(
            startMillis,
            () => makeContinue(n + 1, now + interval, loop(O.some({ startMillis: now, lastRun: now }), n + 1)),
            ({ lastRun, startMillis }) => {
               const runningBehind = now > lastRun + interval;
               const boundary = (now - startMillis) % interval;
               const sleepTime = boundary === 0 ? now : boundary;
               const nextRun = runningBehind ? now : now + sleepTime;

               return makeContinue(
                  n + 1,
                  nextRun,
                  loop(
                     O.some<State>({ startMillis, lastRun: nextRun }),
                     n + 1
                  )
               );
            }
         )
      );

   return makeSchedule(loop(O.none(), 0));
};

const foldMLoop = <R, I, O, R1, B>(
   sf: StepFunction<R, I, O>,
   b: B,
   f: (b: B, o: O) => T.Effect<R1, never, B>
): StepFunction<R & R1, I, B> => (now, i) =>
   T.chain_(sf(now, i), (d) => {
      switch (d._tag) {
         case "Done": {
            return T.pure<Decision<R & R1, I, B>>(makeDone(b));
         }
         case "Continue": {
            return T.map_(f(b, d.out), (b2) => makeContinue(b2, d.interval, foldMLoop(d.next, b2, f)));
         }
      }
   });

/**
 * Returns a new `Schedule` that effectfully folds over the outputs of a `Schedule`.
 */
export const foldM_ = <R, I, O, R1, B>(sc: Schedule<R, I, O>, b: B, f: (b: B, o: O) => T.Effect<R1, never, B>) =>
   makeSchedule(foldMLoop(sc.step, b, f));

/**
 * Returns a new `Schedule` that effectfully folds over the outputs of a `Schedule`.
 */
export const foldM = <R1, O, B>(b: B, f: (b: B, o: O) => T.Effect<R1, never, B>) => <R, I>(sc: Schedule<R, I, O>) =>
   foldM_(sc, b, f);

/**
 * Returns a new `Schedule` that folds over the outputs of a `Schedule`.
 */
export const fold_ = <R, I, O, B>(sc: Schedule<R, I, O>, b: B, f: (b: B, o: O) => B) =>
   foldM_(sc, b, (b, o) => T.pure(f(b, o)));

/**
 * Returns a new `Schedule` that folds over the outputs of a `Schedule`.
 */
export const fold = <O, B>(b: B, f: (b: B, o: O) => B) => <R, I>(sc: Schedule<R, I, O>) => fold_(sc, b, f);

const unfoldLoop = <A>(a: A, f: (a: A) => A): StepFunction<unknown, unknown, A> => (now, _) =>
   T.pure(makeContinue(a, now, unfoldLoop(f(a), f)));

/**
 * Unfolds a schedule that repeats one time from the specified state and iterator.
 */
export const unfold_ = <A>(a: () => A, f: (a: A) => A) =>
   makeSchedule((now) =>
      pipe(
         T.total(a),
         T.map((a) => makeContinue(a, now, unfoldLoop(f(a), f)))
      )
   );

/**
 * Unfolds a schedule that repeats one time from the specified state and iterator.
 */
export const unfold = <A>(f: (a: A) => A) => (a: () => A) => unfold_(a, f);

const unfoldMLoop = <R, A>(a: A, f: (a: A) => T.Effect<R, never, A>): StepFunction<R, unknown, A> => (now, _) =>
   T.pure(makeContinue(a, now, (n, i) => T.chain_(f(a), (x) => unfoldMLoop(x, f)(n, i))));

/**
 * Effectfully unfolds a schedule that repeats one time from the specified state and iterator.
 */
export const unfoldM_ = <R, A>(a: A, f: (a: A) => T.Effect<R, never, A>) => makeSchedule(unfoldMLoop(a, f));

/**
 * Effectfully unfolds a schedule that repeats one time from the specified state and iterator.
 */
export const unfoldM = <R, A>(f: (a: A) => T.Effect<R, never, A>) => (a: A) => unfoldM_(a, f);

/**
 * A schedule that recurs forever and produces a count of repeats.
 */
export const forever = unfold_(constant(0), (n) => n + 1);

/**
 * A schedule spanning all time, which can be stepped only the specified number of times before
 * it terminates.
 */
export const recur = (n: number) => whileOutput_(forever, (x) => x < n);

/**
 * A `Schedule` that recurs one time.
 */
export const once = unit(recur(1));

/**
 * A `Schedule` that stops
 */
export const stop = unit(recur(0));

/**
 * Returns a new schedule that randomly modifies the size of the intervals of this schedule.
 */
export const jittered_ = <R, I, O>(
   sc: Schedule<R, I, O>,
   { max = 0.1, min = 0 }: { min?: number; max?: number } = {}
) => delayedM_(sc, (d) => T.map_(nextDouble, (r) => d * min * (1 - r) + d * max * r));

/**
 * Returns a new schedule that randomly modifies the size of the intervals of this schedule.
 */
export const jittered = ({ max = 0.1, min = 0 }: { min?: number; max?: number } = {}) => <R, I, O>(
   sc: Schedule<R, I, O>
) => jittered_(sc, { min, max });

/**
 * A schedule that always recurs, but will repeat on a linear time
 * interval, given by `base * n` where `n` is the number of
 * repetitions so far. Returns the current duration between recurrences.
 */
export const linear = (base: number) => delayedFrom(map_(forever, (i) => base * (i + 1)));

/**
 * Returns a new schedule that collects the outputs of a `Schedule` into an array.
 */
export const collectAll = <R, I, O>(sc: Schedule<R, I, O>) => fold_(sc, [] as ReadonlyArray<O>, (xs, x) => [...xs, x]);

const identityLoop = <A>(): StepFunction<unknown, A, A> => (now, i) => T.pure(makeContinue(i, now, identityLoop()));

/**
 * A schedule that always recurs and returns inputs as outputs.
 */
export const identity = <A>() => makeSchedule(identityLoop<A>());

/**
 * Returns a new schedule that makes this schedule available on the `Left` side of an `Either`
 * input, allowing propagating some type `X` through this channel on demand.
 */
export const left = <A>() => <R, I, O>(sc: Schedule<R, I, O>) => choose_(sc, identity<A>());

/**
 * Returns a new schedule that makes this schedule available on the `Right` side of an `Either`
 * input, allowing propagating some type `X` through this channel on demand.
 */
export const right = <A>() => <R, I, O>(sc: Schedule<R, I, O>) => choose_(identity<A>(), sc);

/**
 * Returns a new schedule that packs the input and output of this schedule into the first
 * element of a tuple. This allows carrying information through this schedule.
 */
export const first = <A>() => <R, I, O>(sc: Schedule<R, I, O>) => bothInOut_(sc, identity<A>());

/**
 * Returns a new schedule that packs the input and output of this schedule into the second
 * element of a tuple. This allows carrying information through this schedule.
 */
export const second = <A>() => <R, I, O>(sc: Schedule<R, I, O>) => bothInOut_(identity<A>(), sc);

/**
 * A schedule that always recurs, mapping input values through the
 * specified function.
 */
export const fromFunction = <A, B>(f: (a: A) => B) => map_(identity<A>(), f);

/**
 * Returns a schedule that recurs continuously, each repetition spaced the specified duration
 * from the last run.
 */
export const spaced = (duration: number) => addDelay_(forever, () => duration);

const provideAllLoop = <R, I, O>(self: StepFunction<R, I, O>, r: R): StepFunction<unknown, I, O> => (now, i) =>
   T.giveAll(r)(
      T.map_(self(now, i), (d) => {
         switch (d._tag) {
            case "Done": {
               return makeDone(d.out);
            }
            case "Continue": {
               return makeContinue(d.out, d.interval, provideAllLoop(d.next, r));
            }
         }
      })
   );

/**
 * Returns a new schedule with its environment provided to it, so the resulting
 * schedule does not require any environment.
 */
export const provideAll_ = <R, I, O>(sc: Schedule<R, I, O>, r: R): Schedule<unknown, I, O> =>
   makeSchedule(provideAllLoop(sc.step, r));

/**
 * Returns a new schedule with its environment provided to it, so the resulting
 * schedule does not require any environment.
 */
export const provideAll = <R>(r: R) => <I, O>(sc: Schedule<R, I, O>) => provideAll_(sc, r);

const provideSomeLoop = <R, R1, I, O>(self: StepFunction<R, I, O>, r: (_: R1) => R): StepFunction<R1, I, O> => (
   now,
   i
) =>
   T.local_(
      T.map_(self(now, i), (d) => {
         switch (d._tag) {
            case "Done": {
               return makeDone(d.out);
            }
            case "Continue": {
               return makeContinue(d.out, d.interval, provideSomeLoop(d.next, r));
            }
         }
      }),
      r
   );

/**
 * Returns a new schedule with part of its environment provided to it, so the
 * resulting schedule does not require any environment.
 */
export const provideSome_ = <R, R1, I, O>(sc: Schedule<R, I, O>, r: (_: R1) => R): Schedule<R1, I, O> =>
   makeSchedule(provideSomeLoop(sc.step, r));

/**
 * Returns a new schedule with part of its environment provided to it, so the
 * resulting schedule does not require any environment.
 */
export const provideSome = <R, R1>(r: (_: R1) => R) => <I, O>(sc: Schedule<R, I, O>) => provideSome_(sc, r);

const reconsiderMLoop = <R, I, O, R1, O1>(
   self: StepFunction<R, I, O>,
   f: (_: Decision<R, I, O>) => T.Effect<R1, never, E.Either<O1, [O1, number]>>
): StepFunction<R & R1, I, O1> => (now, i) =>
   T.chain_(self(now, i), (d) => {
      switch (d._tag) {
         case "Done": {
            return T.map_(
               f(d),
               E.fold(
                  (o2) => makeDone(o2),
                  ([o2]) => makeDone(o2)
               )
            );
         }
         case "Continue": {
            return T.map_(
               f(d),
               E.fold(
                  (o2) => makeDone(o2),
                  ([o2, int]) => makeContinue(o2, int, reconsiderMLoop(d.next, f))
               )
            );
         }
      }
   });

/**
 * Returns a new schedule that effectfully reconsiders every decision made by this schedule,
 * possibly modifying the next interval and the output type in the process.
 */
export const reconsiderM_ = <R, I, O, R1, O1>(
   sc: Schedule<R, I, O>,
   f: (d: Decision<R, I, O>) => T.Effect<R1, never, Either<O1, [O1, number]>>
): Schedule<R & R1, I, O1> => makeSchedule(reconsiderMLoop(sc.step, f));

/**
 * Returns a new schedule that effectfully reconsiders every decision made by this schedule,
 * possibly modifying the next interval and the output type in the process.
 */
export const reconsiderM = <R, I, O, R1, O1>(
   f: (d: Decision<R, I, O>) => T.Effect<R1, never, Either<O1, [O1, number]>>
) => (sc: Schedule<R, I, O>) => reconsiderM_(sc, f);

/**
 * Returns a new schedule that reconsiders every decision made by this schedule,
 * possibly modifying the next interval and the output type in the process.
 */
export const reconsider_ = <R, I, O, O1>(
   sc: Schedule<R, I, O>,
   f: (d: Decision<R, I, O>) => Either<O1, [O1, number]>
) => reconsiderM_(sc, (d) => T.pure(f(d)));

/**
 * Returns a new schedule that reconsiders every decision made by this schedule,
 * possibly modifying the next interval and the output type in the process.
 */
export const reconsider = <R, I, O, O1>(f: (d: Decision<R, I, O>) => Either<O1, [O1, number]>) => (
   sc: Schedule<R, I, O>
) => reconsider_(sc, f);

/**
 * A schedule that recurs for as long as the effectful predicate evaluates to true.
 */
export const recurWhileM = <R, A>(f: (a: A) => T.Effect<R, never, boolean>) => whileInputM_(identity<A>(), f);

/**
 * A schedule that recurs for as long as the predicate evaluates to true.
 */
export const recurWhile = <A>(f: (a: A) => boolean) => whileInput_(identity<A>(), f);

/**
 * A schedule that recurs for as long as the predicate evaluates to true.
 */
export const recurWhileEqual = <A>(a: A) => whileInput_(identity<A>(), (x) => a === x);

/**
 * A schedule that recurs until the effectful predicate evaluates to true.
 */
export const recurUntilM = <R, A>(f: (a: A) => T.Effect<R, never, boolean>) => untilInputM_(identity<A>(), f);

/**
 * A schedule that recurs until the predicate evaluates to true.
 */
export const recurUntil = <A>(f: (a: A) => boolean) => untilInput_(identity<A>(), f);

/**
 * A schedule that recurs until the predicate evaluates to true.
 */
export const recurUntilEqual = <A>(a: A) => untilInput_(identity<A>(), (x) => x === a);

/**
 * Returns a new schedule that outputs the number of repetitions of this one.
 */
export const repetitions = <R, I, O>(sc: Schedule<R, I, O>) => fold_(sc, 0, (n) => n + 1);

const resetWhenLoop = <R, I, O>(
   sc: Schedule<R, I, O>,
   step: StepFunction<R, I, O>,
   f: (o: O) => boolean
): StepFunction<R, I, O> => (now, i) =>
   T.chain_(step(now, i), (d) => {
      switch (d._tag) {
         case "Done": {
            return f(d.out) ? sc.step(now, i) : T.pure(makeDone(d.out));
         }
         case "Continue": {
            return f(d.out) ? sc.step(now, i) : T.pure(makeContinue(d.out, d.interval, resetWhenLoop(sc, d.next, f)));
         }
      }
   });

/**
 * Resets the schedule when the specified predicate on the schedule output evaluates to true.
 */
export const resetWhen_ = <R, I, O>(sc: Schedule<R, I, O>, f: (o: O) => boolean) =>
   makeSchedule(resetWhenLoop(sc, sc.step, f));

/**
 * Resets the schedule when the specified predicate on the schedule output evaluates to true.
 */
export const resetWhen = <O>(f: (o: O) => boolean) => <R, I>(sc: Schedule<R, I, O>) => resetWhen_(sc, f);

const runLoop = <R, I, O>(
   self: StepFunction<R, I, O>,
   now: number,
   xs: readonly I[],
   acc: readonly O[]
): T.Effect<R, never, readonly O[]> =>
   xs.length > 0
      ? T.chain_(self(now, xs[0]), (d) => {
           switch (d._tag) {
              case "Done": {
                 return T.pure([...acc, d.out]);
              }
              case "Continue": {
                 return runLoop(d.next, d.interval, xs, [...acc, d.out]);
              }
           }
        })
      : T.pure(acc);

export const run_ = <R, I, O>(sc: Schedule<R, I, O>, now: number, i: Iterable<I>) =>
   runLoop(sc.step, now, Array.from(i), []);

export const run = <I>(now: number, i: Iterable<I>) => <R, O>(sc: Schedule<R, I, O>) => run_(sc, now, i);

const onDecisionLoop = <R, I, O, R1>(
   self: StepFunction<R, I, O>,
   f: (d: Decision<R, I, O>) => T.Effect<R1, never, any>
): StepFunction<R & R1, I, O> => (now, i) =>
   T.chain_(self(now, i), (d) => {
      switch (d._tag) {
         case "Done": {
            return T.as_(f(d), makeDone(d.out));
         }
         case "Continue": {
            return T.as_(f(d), makeContinue(d.out, d.interval, onDecisionLoop(d.next, f)));
         }
      }
   });

/**
 * Returns a new schedule that applies the current one but runs the specified effect
 * for every decision of this schedule. This can be used to create schedules
 * that log failures, decisions, or computed values.
 */
export const onDecision_ = <R, I, O, R1>(
   sc: Schedule<R, I, O>,
   f: (d: Decision<R, I, O>) => T.Effect<R1, never, any>
) => makeSchedule(onDecisionLoop(sc.step, f));

/**
 * Returns a new schedule that applies the current one but runs the specified effect
 * for every decision of this schedule. This can be used to create schedules
 * that log failures, decisions, or computed values.
 */
export const onDecision = <R, I, O, R1>(f: (d: Decision<R, I, O>) => T.Effect<R1, never, any>) => (
   sc: Schedule<R, I, O>
) => onDecision_(sc, f);

const tapInputLoop = <R, I, O, R1>(
   self: StepFunction<R, I, O>,
   f: (i: I) => T.Effect<R1, never, any>
): StepFunction<R & R1, I, O> => (now, i) =>
   T.chain_(f(i), () =>
      T.map_(self(now, i), (d) => {
         switch (d._tag) {
            case "Done": {
               return makeDone(d.out);
            }
            case "Continue": {
               return makeContinue(d.out, d.interval, tapInputLoop(d.next, f));
            }
         }
      })
   );

export const tapInput_ = <R, I, O, R1>(
   sc: Schedule<R, I, O>,
   f: (i: I) => T.Effect<R1, never, any>
): Schedule<R & R1, I, O> => makeSchedule(tapInputLoop(sc.step, f));

export const tapInput = <R1, I>(f: (i: I) => T.Effect<R1, never, any>) => <R, O>(sc: Schedule<R, I, O>) =>
   tapInput_(sc, f);

const tapOutputLoop = <R, I, O, R1>(
   self: StepFunction<R, I, O>,
   f: (o: O) => T.Effect<R1, never, any>
): StepFunction<R & R1, I, O> => (now, i) =>
   T.chain_(self(now, i), (d) => {
      switch (d._tag) {
         case "Done": {
            return T.as_(f(d.out), makeDone(d.out));
         }
         case "Continue": {
            return T.as_(f(d.out), makeContinue(d.out, d.interval, tapOutputLoop(d.next, f)));
         }
      }
   });

export const tapOutput_ = <R, I, O, R1>(
   sc: Schedule<R, I, O>,
   f: (o: O) => T.Effect<R1, never, any>
): Schedule<R & R1, I, O> => makeSchedule(tapOutputLoop(sc.step, f));

export const tapOutput = <R1, O>(f: (o: O) => T.Effect<R1, never, any>) => <R, I>(sc: Schedule<R, I, O>) =>
   tapOutput_(sc, f);

const windowedLoop = (
   interval: number,
   startMillis: Option<number>,
   n: number
): StepFunction<unknown, unknown, number> => (now, _) =>
   T.pure(
      O.fold_(
         startMillis,
         () => makeContinue(n + 1, now + interval, windowedLoop(interval, O.some(now), n + 1)),
         (startMillis) =>
            makeContinue(
               n + 1,
               now + ((now - startMillis) % interval),
               windowedLoop(interval, O.some(startMillis), n + 1)
            )
      )
   );

export const windowed = (interval: number) => makeSchedule(windowedLoop(interval, O.none(), 0));

/**
 * Returns a new schedule that performs a geometric intersection on the intervals defined
 * by both schedules.
 */
export const zip_ = <R, I, O, R1, I1, O1>(sc: Schedule<R, I, O>, that: Schedule<R1, I1, O1>) =>
   combineWith_(sc, that, (d, d2) => Math.max(d, d2));

/**
 * Returns a new schedule that performs a geometric intersection on the intervals defined
 * by both schedules.
 */
export const zip = <R1, I1, O1>(that: Schedule<R1, I1, O1>) => <R, I, O>(sc: Schedule<R, I, O>) => zip_(sc, that);

/**
 * Same as zip but ignores the right output.
 */
export const zipl_ = <R, I, O, R1, I1, O1>(sc: Schedule<R, I, O>, that: Schedule<R1, I1, O1>) =>
   map_(zip_(sc, that), ([_]) => _);

/**
 * Same as zip but ignores the right output.
 */
export const zipl = <R1, I1, O1>(that: Schedule<R1, I1, O1>) => <R, I, O>(sc: Schedule<R, I, O>) => zipl_(sc, that);

/**
 * Same as zip but ignores the left output.
 */
export const zipr_ = <R, I, O, R1, I1, O1>(sc: Schedule<R, I, O>, that: Schedule<R1, I1, O1>) =>
   map_(zip_(sc, that), ([_, __]) => __);

/**
 * Same as zip but ignores the left output.
 */
export const zipr = <R1, I1, O1>(that: Schedule<R1, I1, O1>) => <R, I, O>(sc: Schedule<R, I, O>) => zipr_(sc, that);

/**
 * Equivalent to `zip` followed by `map`.
 */
export const zipWith_ = <R, I, O, R1, I1, O1, O2>(
   sc: Schedule<R, I, O>,
   that: Schedule<R1, I1, O1>,
   f: (o: O, o1: O1) => O2
) => map_(zip_(sc, that), ([o, o1]) => f(o, o1));

/**
 * Equivalent to `zip` followed by `map`.
 */
export const zipWith = <R1, I1, O, O1, O2>(that: Schedule<R1, I1, O1>, f: (o: O, o1: O1) => O2) => <R, I>(
   sc: Schedule<R, I, O>
) => zipWith_(sc, that, f);
