import * as A from "../../Array/_core";
import type { Either } from "../../Either";
import * as E from "../../Either";
import { flow, pipe, tuple } from "../../Function";
import * as XR from "../../IORef";
import type { NonEmptyArray } from "../../NonEmptyArray";
import * as XP from "../../Promise";
import * as I from "../_core";
import * as C from "../Cause";
import type { Exit } from "../Exit";
import * as Ex from "../Exit";
import * as Fiber from "../Fiber";
import { join } from "../Fiber/combinators/join";
import type { IO, UIO } from "../model";
import { raceWith_ } from "./core-scope";
import { makeInterruptible, onInterrupt, uninterruptibleMask } from "./interrupt";
import { mapErrorCause_ } from "./mapErrorCause";

const mergeInterruption = <E1, A, A1>(a: A) => (x: Exit<E1, A1>): IO<unknown, E1, A> => {
  switch (x._tag) {
    case "Success":
      return I.pure(a);
    case "Failure":
      return C.interruptedOnly(x.cause) ? I.pure(a) : I.halt(x.cause);
  }
};

/**
 * Returns an IO that races this effect with the specified effect,
 * returning the first successful `A` from the faster side. If one effect
 * succeeds, the other will be interrupted. If neither succeeds, then the
 * effect will fail with some error.
 *
 * WARNING: The raced effect will safely interrupt the "loser", but will not
 * resume until the loser has been cleanly terminated.
 */
export function race_<R, E, A, R1, E1, A1>(
  ef: IO<R, E, A>,
  that: IO<R1, E1, A1>
): IO<R & R1, E | E1, A | A1> {
  return I.descriptorWith((d) =>
    raceWith_(
      ef,
      that,
      (exit, right) =>
        Ex.foldM_(
          exit,
          (cause) => mapErrorCause_(join(right), (_) => C.both(cause, _)),
          (a) => I.chain_(right.interruptAs(d.id), mergeInterruption(a))
        ),
      (exit, left) =>
        Ex.foldM_(
          exit,
          (cause) => mapErrorCause_(join(left), (_) => C.both(cause, _)),
          (a) => I.chain_(left.interruptAs(d.id), mergeInterruption(a))
        )
    )
  );
}

/**
 * Returns an IO that races this effect with the specified effect,
 * returning the first successful `A` from the faster side. If one effect
 * succeeds, the other will be interrupted. If neither succeeds, then the
 * effect will fail with some error.
 *
 * WARNING: The raced effect will safely interrupt the "loser", but will not
 * resume until the loser has been cleanly terminated.
 */
export function race<R1, E1, A1>(
  that: IO<R1, E1, A1>
): <R, E, A>(ef: IO<R, E, A>) => IO<R & R1, E1 | E, A1 | A> {
  return (ef) => race_(ef, that);
}

/**
 * Returns an IO that races this effect with the specified effect,
 * yielding the first result to succeed. If neither effect succeeds, then the
 * composed effect will fail with some error.
 *
 * WARNING: The raced effect will safely interrupt the "loser", but will not
 * resume until the loser has been cleanly terminated.
 */
export function raceEither_<R, E, A, R1, E1, A1>(
  fa: IO<R, E, A>,
  that: IO<R1, E1, A1>
): IO<R & R1, E | E1, Either<A, A1>> {
  return race_(I.map_(fa, E.left), I.map_(that, E.right));
}

/**
 * Returns an IO that races this effect with the specified effect,
 * yielding the first result to succeed. If neither effect succeeds, then the
 * composed effect will fail with some error.
 *
 * WARNING: The raced effect will safely interrupt the "loser", but will not
 * resume until the loser has been cleanly terminated.
 */
export function raceEither<R1, E1, A1>(
  that: IO<R1, E1, A1>
): <R, E, A>(fa: IO<R, E, A>) => IO<R & R1, E1 | E, Either<A, A1>> {
  return (fa) => raceEither_(fa, that);
}

/**
 * Returns an IO that races this effect with the specified effect,
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
export function raceFirst<R1, E1, A1>(that: IO<R1, E1, A1>) {
  return <R, E, A>(ef: IO<R, E, A>): IO<R & R1, E | E1, A | A1> =>
    pipe(
      race_(I.result(ef), I.result(that)),
      I.chain((a) => I.done(a as Exit<E | E1, A | A1>))
    );
}

const arbiter = <E, A>(
  fibers: ReadonlyArray<Fiber.Fiber<E, A>>,
  winner: Fiber.Fiber<E, A>,
  promise: XP.Promise<E, readonly [A, Fiber.Fiber<E, A>]>,
  fails: XR.URef<number>
) => (res: Exit<E, A>): UIO<void> =>
  Ex.foldM_(
    res,
    (e) =>
      pipe(
        fails,
        XR.modify((c) => tuple(c === 0 ? pipe(promise, XP.halt(e), I.asUnit) : I.unit(), c - 1)),
        I.flatten
      ),
    (a) =>
      pipe(
        promise,
        XP.succeed(tuple(a, winner)),
        I.chain((set) =>
          set
            ? A.reduce_(fibers, I.unit(), (io, f) =>
                f === winner ? io : I.tap_(io, () => Fiber.interrupt(f))
              )
            : I.unit()
        )
      )
  );

/**
 * Returns an IO that races this effect with all the specified effects,
 * yielding the value of the first effect to succeed with a value.
 * Losers of the race will be interrupted immediately.
 *
 * Note: in case of success eventual interruption errors are ignored
 */
export function raceAll<R, E, A>(
  ios: NonEmptyArray<IO<R, E, A>>,
  interruptStrategy: "background" | "wait" = "background"
): IO<R, E, A> {
  return pipe(
    I.do,
    I.bindS("done", () => XP.make<E, readonly [A, Fiber.Fiber<E, A>]>()),
    I.bindS("fails", () => XR.make(ios.length)),
    I.bindS("c", ({ done, fails }) =>
      uninterruptibleMask(({ restore }) =>
        pipe(
          I.do,
          I.bindS("fs", () => I.foreach_(ios, flow(makeInterruptible, I.fork))),
          I.tap(({ fs }) =>
            A.reduce_(fs, I.unit(), (io, f) =>
              I.chain_(io, () => pipe(f.await, I.chain(arbiter(fs, f, done, fails)), I.fork))
            )
          ),
          I.letS("inheritRefs", () => (res: readonly [A, Fiber.Fiber<E, A>]) =>
            pipe(
              res[1].inheritRefs,
              I.as(() => res[0])
            )
          ),
          I.bindS("c", ({ fs, inheritRefs }) =>
            pipe(
              restore(pipe(done, XP.await, I.chain(inheritRefs))),
              onInterrupt(() =>
                A.reduce_(fs, I.unit(), (io, f) => I.tap_(io, () => Fiber.interrupt(f)))
              )
            )
          ),
          I.map(({ c, fs }) => ({ c, fs }))
        )
      )
    ),
    I.tap(({ c: { fs } }) =>
      interruptStrategy === "wait" ? I.foreach_(fs, (f) => f.await) : I.unit()
    ),
    I.map(({ c: { c } }) => c)
  );
}
