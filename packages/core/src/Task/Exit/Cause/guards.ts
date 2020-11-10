import { matchTag } from "@principia/prelude/Utils";

import { flow, pipe } from "../../../Function";
import * as O from "../../../Option";
import { dieOption, failureOption, foldl_, interruptOption } from "./destructors";
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
 * didFail :: Cause e -> Boolean
 * ```
 *
 * Returns if the cause has a failure in it
 */
export const didFail: <E>(cause: Cause<E>) => boolean = flow(
   failureOption,
   O.map(() => true),
   O.getOrElse(() => false)
);

/**
 * ```haskell
 * isThen :: Cause e -> Boolean
 * ```
 */
export const isThen = <E>(cause: Cause<E>): cause is Then<E> => cause._tag === "Then";

/**
 * ```haskell
 * isBoth :: Cause e -> Boolean
 * ```
 */
export const isBoth = <E>(cause: Cause<E>): cause is Both<E> => cause._tag === "Both";

/**
 * ```haskell
 * isEmpty :: Cause e -> Boolean
 * ```
 */
export const isEmpty = <E>(cause: Cause<E>) =>
   equalsCause(cause, empty) ||
   foldl_(cause, true as boolean, (acc, c) => {
      switch (c._tag) {
         case "Empty":
            return O.some(acc);
         case "Die":
            return O.some(false);
         case "Fail":
            return O.some(false);
         case "Interrupt":
            return O.some(false);
         case "Then":
            return O.none();
         case "Both":
            return O.none();
      }
   });

/**
 * ```haskell
 * isDie :: Cause e -> Boolean
 * ```
 *
 * Returns if a cause contains a defect
 */
export const isDie: <E>(cause: Cause<E>) => boolean = flow(
   dieOption,
   O.map(() => true),
   O.getOrElse(() => false)
);

/**
 * ```haskell
 * isInterrupt :: Cause e -> Boolean
 * ```
 *
 * Returns if the cause contains an interruption in it
 */
export const isInterrupt = <E>(cause: Cause<E>) =>
   pipe(
      cause,
      interruptOption,
      O.map(() => true),
      O.getOrElse(() => false)
   );

/**
 * ```haskell
 * contains :: Cause c => c f -> c e -> Boolean
 * ```
 *
 * Determines if this cause contains or is equal to the specified cause.
 */
export const contains = <E, E1 extends E = E>(that: Cause<E1>) => (cause: Cause<E>) =>
   equalsCause(that, cause) ||
   foldl_(cause, false as boolean, (_, c) => (equalsCause(that, c) ? O.some(true) : O.none()));
