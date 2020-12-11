import * as A from "../../Array/_core";
import { flow, pipe, tuple } from "../../Function";
import * as XR from "../../IORef";
import type { NonEmptyArray } from "../../NonEmptyArray";
import * as XP from "../../Promise";
import * as I from "../_core";
import type { Exit } from "../Exit";
import * as Ex from "../Exit";
import * as Fiber from "../Fiber";
import type { IO, UIO } from "../model";
import { makeInterruptible, onInterrupt, uninterruptibleMask } from "./interrupt";

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