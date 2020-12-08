import { flow, pipe } from "../../Function";
import * as O from "../../Option";
import { dieOption, failureOption, foldLeft_, interruptOption } from "./destructors";
import { empty } from "./empty";
import { equalsCause } from "./eq";
import type { Both, Cause, Then } from "./model";

/*
 * -------------------------------------------
 * Cause Guards
 * -------------------------------------------
 */

/**
 * ```haskell
 * failed :: Cause e -> Boolean
 * ```
 *
 * Returns if the cause has a failure in it
 */
export const failed: <E>(cause: Cause<E>) => boolean = flow(
  failureOption,
  O.map(() => true),
  O.getOrElse(() => false)
);

/**
 * ```haskell
 * isThen :: Cause e -> Boolean
 * ```
 */
export function isThen<E>(cause: Cause<E>): cause is Then<E> {
  return cause._tag === "Then";
}

/**
 * ```haskell
 * isBoth :: Cause e -> Boolean
 * ```
 */
export function isBoth<E>(cause: Cause<E>): cause is Both<E> {
  return cause._tag === "Both";
}

/**
 * ```haskell
 * isEmpty :: Cause e -> Boolean
 * ```
 */
export function isEmpty<E>(cause: Cause<E>): boolean {
  return (
    equalsCause(cause, empty) ||
    foldLeft_(cause, true as boolean, (acc, c) => {
      switch (c._tag) {
        case "Empty":
          return O.some(acc);
        case "Die":
          return O.some(false);
        case "Fail":
          return O.some(false);
        case "Interrupt":
          return O.some(false);
        default: {
          return O.none();
        }
      }
    })
  );
}

/**
 * ```haskell
 * died :: Cause e -> Boolean
 * ```
 *
 * Returns if a cause contains a defect
 */
export const died: <E>(cause: Cause<E>) => boolean = flow(
  dieOption,
  O.map(() => true),
  O.getOrElse(() => false)
);

/**
 * ```haskell
 * interrupted :: Cause e -> Boolean
 * ```
 *
 * Returns if the cause contains an interruption in it
 */
export function interrupted<E>(cause: Cause<E>): boolean {
  return pipe(
    cause,
    interruptOption,
    O.map(() => true),
    O.getOrElse(() => false)
  );
}

/**
 * ```haskell
 * contains :: Cause -> Cause -> Boolean
 * ```
 *
 * Determines if this cause contains or is equal to the specified cause.
 */
export function contains<E, E1 extends E = E>(that: Cause<E1>): (cause: Cause<E>) => boolean {
  return (cause) =>
    equalsCause(that, cause) ||
    foldLeft_(cause, false as boolean, (_, c) => (equalsCause(that, c) ? O.some(true) : O.none()));
}

export function isCause(u: unknown): u is Cause<unknown> {
  return (
    typeof u === "object" &&
    u !== null &&
    "_tag" in u &&
    ["Empty", "Fail", "Die", "Interrupt", "Then", "Both", "Traced"].includes(u["_tag"])
  );
}
