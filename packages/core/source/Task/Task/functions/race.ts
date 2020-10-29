import * as A from "../../../Array";
import type { Either } from "../../../Either";
import * as E from "../../../Either";
import { flow, pipe, tuple } from "../../../Function";
import type { NonEmptyArray } from "../../../NonEmptyArray";
import type { Exit } from "../../Exit";
import * as Ex from "../../Exit";
import * as C from "../../Exit/Cause";
import * as Fiber from "../../Fiber";
import { join } from "../../Fiber/functions/join";
import * as XP from "../../XPromise";
import * as XR from "../../XRef";
import * as _ from "../core";
import { raceWith } from "../core-scope";
import type { IO, Task } from "../model";
import { makeInterruptible, onInterrupt, uninterruptibleMask } from "./interrupt";
import { mapErrorCause_ } from "./mapErrorCause";

const mergeInterruption = <E1, A, A1>(a: A) => (x: Exit<E1, A1>): Task<unknown, E1, A> => {
   switch (x._tag) {
      case "Success":
         return _.pure(a);
      case "Failure":
         return C.interruptedOnly(x.cause) ? _.pure(a) : _.halt(x.cause);
   }
};

/**
 * Returns a task that races this effect with the specified effect,
 * returning the first successful `A` from the faster side. If one effect
 * succeeds, the other will be interrupted. If neither succeeds, then the
 * effect will fail with some error.
 *
 * WARNING: The raced effect will safely interrupt the "loser", but will not
 * resume until the loser has been cleanly terminated.
 */
export const race_ = <R, E, A, R1, E1, A1>(ef: Task<R, E, A>, that: Task<R1, E1, A1>): Task<R & R1, E | E1, A | A1> =>
   _.checkDescriptor((d) =>
      raceWith(
         ef,
         that,
         (exit, right) =>
            Ex.foldTask_(
               exit,
               (cause) => mapErrorCause_(join(right), (_) => C.both(cause, _)),
               (a) => _.chain_(right.interruptAs(d.id), mergeInterruption(a))
            ),
         (exit, left) =>
            Ex.foldTask_(
               exit,
               (cause) => mapErrorCause_(join(left), (_) => C.both(cause, _)),
               (a) => _.chain_(left.interruptAs(d.id), mergeInterruption(a))
            )
      )
   );

/**
 * Returns a task that races this effect with the specified effect,
 * returning the first successful `A` from the faster side. If one effect
 * succeeds, the other will be interrupted. If neither succeeds, then the
 * effect will fail with some error.
 *
 * WARNING: The raced effect will safely interrupt the "loser", but will not
 * resume until the loser has been cleanly terminated.
 */
export const race = <R1, E1, A1>(that: Task<R1, E1, A1>) => <R, E, A>(ef: Task<R, E, A>) => race_(ef, that);

/**
 * Returns a task that races this effect with the specified effect,
 * yielding the first result to succeed. If neither effect succeeds, then the
 * composed effect will fail with some error.
 *
 * WARNING: The raced effect will safely interrupt the "loser", but will not
 * resume until the loser has been cleanly terminated.
 */
export const raceEither_ = <R, E, A, R1, E1, A1>(
   fa: Task<R, E, A>,
   that: Task<R1, E1, A1>
): Task<R & R1, E | E1, Either<A, A1>> => race_(_.map_(fa, E.left), _.map_(that, E.right));

/**
 * Returns a task that races this effect with the specified effect,
 * yielding the first result to succeed. If neither effect succeeds, then the
 * composed effect will fail with some error.
 *
 * WARNING: The raced effect will safely interrupt the "loser", but will not
 * resume until the loser has been cleanly terminated.
 */
export const raceEither = <R1, E1, A1>(that: Task<R1, E1, A1>) => <R, E, A>(fa: Task<R, E, A>) => raceEither_(fa, that);

/**
 * Returns a task that races this effect with the specified effect,
 * yielding the first result to complete, whether by success or failure. If
 * neither effect completes, then the composed effect will not complete.
 *
 * WARNING: The raced effect will safely interrupt the "loser", but will not
 * resume until the loser has been cleanly terminated. If early return is
 * desired, then instead of performing `l raceFirst r`, perform
 * `l.disconnect raceFirst r.disconnect`, which disconnects left and right
 * interrupt signal, allowing a fast return, with interruption performed
 * in the background.
 */
export const raceFirst = <R1, E1, A1>(that: Task<R1, E1, A1>) => <R, E, A>(
   ef: Task<R, E, A>
): Task<R & R1, E | E1, A | A1> =>
   pipe(
      race_(_.result(ef), _.result(that)),
      _.chain((a) => _.done(a as Exit<E | E1, A | A1>))
   );

const arbiter = <E, A>(
   fibers: ReadonlyArray<Fiber.Fiber<E, A>>,
   winner: Fiber.Fiber<E, A>,
   promise: XP.XPromise<E, readonly [A, Fiber.Fiber<E, A>]>,
   fails: XR.Ref<number>
) => (res: Exit<E, A>): IO<void> =>
   Ex.foldTask_(
      res,
      (e) =>
         pipe(
            fails,
            XR.modify((c) => tuple(c === 0 ? pipe(promise, XP.halt(e), _.asUnit) : _.unit, c - 1)),
            _.flatten
         ),
      (a) =>
         pipe(
            promise,
            XP.succeed(tuple(a, winner)),
            _.chain((set) =>
               set
                  ? A.reduce_(fibers, _.unit as IO<void>, (io, f) =>
                       f === winner ? io : _.tap_(io, () => Fiber.interrupt(f))
                    )
                  : _.unit
            )
         )
   );

/**
 * Returns a task that races this effect with all the specified effects,
 * yielding the value of the first effect to succeed with a value.
 * Losers of the race will be interrupted immediately.
 *
 * Note: in case of success eventual interruption errors are ignored
 */
export const raceAll = <R, E, A>(
   ios: NonEmptyArray<Task<R, E, A>>,
   interruptStrategy: "background" | "wait" = "background"
): Task<R, E, A> =>
   pipe(
      _.do,
      _.bindS("done", () => XP.make<E, readonly [A, Fiber.Fiber<E, A>]>()),
      _.bindS("fails", () => XR.makeRef(ios.length)),
      _.bindS("c", ({ done, fails }) =>
         uninterruptibleMask(({ restore }) =>
            pipe(
               _.do,
               _.bindS("fs", () => _.foreach_(ios, flow(makeInterruptible, _.fork))),
               _.tap(({ fs }) =>
                  A.reduce_(fs, _.unit as IO<void>, (io, f) =>
                     _.chain_(io, () => pipe(f.await, _.chain(arbiter(fs, f, done, fails)), _.fork))
                  )
               ),
               _.letS("inheritRefs", () => (res: readonly [A, Fiber.Fiber<E, A>]) =>
                  pipe(res[1].inheritRefs, _.as(res[0]))
               ),
               _.bindS("c", ({ fs, inheritRefs }) =>
                  pipe(
                     restore(pipe(done, XP.await, _.chain(inheritRefs))),
                     onInterrupt(() =>
                        A.reduce_(fs, _.unit as IO<void>, (io, f) => _.tap_(io, () => Fiber.interrupt(f)))
                     )
                  )
               ),
               _.map(({ c, fs }) => ({ c, fs }))
            )
         )
      ),
      _.tap(({ c: { fs } }) => (interruptStrategy === "wait" ? _.foreach_(fs, (f) => f.await) : _.unit)),
      _.map(({ c: { c } }) => c)
   );
