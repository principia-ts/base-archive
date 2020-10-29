import { matchTag } from "@principia/prelude/Utils";

import * as A from "../../../Array";
import * as E from "../../../Either";
import { pipe } from "../../../Function";
import * as O from "../../../Option";
import type { FiberId } from "../../Fiber/FiberId";
import { both, then } from "./constructors";
import { failureOption, find, foldl_ } from "./destructors";
import { empty } from "./empty";
import { InterruptedException } from "./errors";
import { map } from "./functor";
import { didFail, isDie, isInterrupt } from "./guards";
import type { Cause } from "./model";

/*
 * -------------------------------------------
 * Cause Combinators
 * -------------------------------------------
 */

/**
 * ```haskell
 * as :: Functor f => b -> f a -> f b
 * ```
 *
 * Substitutes a value under a type constructor
 *
 * @category Combinators
 * @since 1.0.0
 */
export const as = <E1>(e: E1): (<E>(fa: Cause<E>) => Cause<E1>) => map(() => e);

/**
 * Extracts a list of non-recoverable errors from the `Cause`.
 */
export const defects = <E>(cause: Cause<E>): ReadonlyArray<unknown> =>
   foldl_(cause, [] as ReadonlyArray<unknown>, (a, c) => (c._tag === "Die" ? O.some([...a, c.value]) : O.none()));

/**
 * Produces a list of all recoverable errors `E` in the `Cause`.
 */
export const failures = <E>(cause: Cause<E>): ReadonlyArray<E> =>
   foldl_(cause, [] as readonly E[], (a, c) => (c._tag === "Fail" ? O.some([...a, c.value]) : O.none()));

/**
 * Returns a set of interruptors, fibers that interrupted the fiber described
 * by this `Cause`.
 */
export const interruptors = <E>(cause: Cause<E>): ReadonlySet<FiberId> =>
   foldl_(cause, new Set(), (s, c) => (c._tag === "Interrupt" ? O.some(s.add(c.fiberId)) : O.none()));

/**
 * Determines if the `Cause` contains only interruptions and not any `Die` or
 * `Fail` causes.
 */
export const interruptedOnly = <E>(cause: Cause<E>) =>
   pipe(
      cause,
      find((c) => (isDie(c) || didFail(c) ? O.some(false) : O.none())),
      O.getOrElse(() => true)
   );

/**
 * Discards all typed failures kept on this `Cause`.
 */
export const stripFailures: <E>(cause: Cause<E>) => Cause<never> = matchTag({
   Empty: () => empty,
   Fail: () => empty,
   Interrupt: (c) => c,
   Die: (c) => c,
   Both: (c) => both(stripFailures(c.left), stripFailures(c.right)),
   Then: (c) => then(stripFailures(c.left), stripFailures(c.right))
});

/**
 * Discards all typed failures kept on this `Cause`.
 */
export const stripInterrupts: <E>(cause: Cause<E>) => Cause<E> = matchTag({
   Empty: () => empty,
   Fail: (c) => c,
   Interrupt: () => empty,
   Die: (c) => c,
   Both: (c) => both(stripInterrupts(c.left), stripInterrupts(c.right)),
   Then: (c) => then(stripInterrupts(c.left), stripInterrupts(c.right))
});

/**
 * Remove all `Fail` and `Interrupt` nodes from this `Cause`,
 * return only `Die` cause/finalizer defects.
 */
export const keepDefects: <E>(cause: Cause<E>) => O.Option<Cause<never>> = matchTag({
   Empty: () => O.none(),
   Fail: () => O.none(),
   Interrupt: () => O.none(),
   Die: (c) => O.some(c),
   Then: (c) => {
      const lefts = keepDefects(c.left);
      const rights = keepDefects(c.right);
      return lefts._tag === "Some"
         ? rights._tag === "Some"
            ? O.some(then(lefts.value, rights.value))
            : lefts
         : rights._tag === "Some"
         ? rights
         : O.none();
   },
   Both: (c) => {
      const lefts = keepDefects(c.left);
      const rights = keepDefects(c.right);
      return lefts._tag === "Some"
         ? rights._tag === "Some"
            ? O.some(both(lefts.value, rights.value))
            : lefts
         : rights._tag === "Some"
         ? rights
         : O.none();
   }
});

/**
 * Converts the specified `Cause<Either<E, A>>` to an `Either<Cause<E>, A>`.
 */
export const sequenceCauseEither: <E, A>(c: Cause<E.Either<E, A>>) => E.Either<Cause<E>, A> = matchTag({
   Empty: () => E.left(empty),
   Interrupt: (c) => E.left(c),
   Fail: (c) => (c.value._tag === "Left" ? E.left(fail(c.value.left)) : E.right(c.value.right)),
   Die: (c) => E.left(c),
   Then: (c) => {
      const lefts = sequenceCauseEither(c.left);
      const rights = sequenceCauseEither(c.right);
      return lefts._tag === "Left"
         ? rights._tag === "Right"
            ? E.right(rights.right)
            : E.left(then(lefts.left, rights.left))
         : E.right(lefts.right);
   },
   Both: (c) => {
      const lefts = sequenceCauseEither(c.left);
      const rights = sequenceCauseEither(c.right);
      return lefts._tag === "Left"
         ? rights._tag === "Right"
            ? E.right(rights.right)
            : E.left(both(lefts.left, rights.left))
         : E.right(lefts.right);
   }
});

/**
 * Converts the specified `Cause<Either<E, A>>` to an `Either<Cause<E>, A>`.
 */
export const sequenceCauseOption: <E>(c: Cause<O.Option<E>>) => O.Option<Cause<E>> = matchTag({
   Empty: () => O.some(empty),
   Interrupt: (c) => O.some(c),
   Fail: (c) => O.map_(c.value, fail),
   Die: (c) => O.some(c),
   Then: (c) => {
      const lefts = sequenceCauseOption(c.left);
      const rights = sequenceCauseOption(c.right);
      return lefts._tag === "Some"
         ? rights._tag === "Some"
            ? O.some(then(lefts.value, rights.value))
            : lefts
         : rights._tag === "Some"
         ? rights
         : O.none();
   },
   Both: (c) => {
      const lefts = sequenceCauseOption(c.left);
      const rights = sequenceCauseOption(c.right);
      return lefts._tag === "Some"
         ? rights._tag === "Some"
            ? O.some(both(lefts.value, rights.value))
            : lefts
         : rights._tag === "Some"
         ? rights
         : O.none();
   }
});

/**
 * Retrieve the first checked error on the `Left` if available,
 * if there are no checked errors return the rest of the `Cause`
 * that is known to contain only `Die` or `Interrupt` causes.
 * */
export const failureOrCause = <E>(cause: Cause<E>): E.Either<E, Cause<never>> =>
   pipe(
      cause,
      failureOption,
      O.map(E.left),
      O.getOrElse(() => E.right(cause as Cause<never>)) // no E inside this cause, can safely cast
   );

/**
 * Squashes a `Cause` down to a single `Throwable`, chosen to be the
 * "most important" `Throwable`.
 */
export const squash = <E>(f: (e: E) => unknown) => (cause: Cause<E>): unknown =>
   pipe(
      cause,
      failureOption,
      O.map(f),
      O.alt(() =>
         isInterrupt(cause)
            ? O.some<unknown>(
                 new InterruptedException(
                    "Interrupted by fibers: " +
                       Array.from(interruptors(cause))
                          .map((_) => _.seqNumber.toString())
                          .map((_) => "#" + _)
                          .join(", ")
                 )
              )
            : O.none()
      ),
      O.alt(() => A.head(defects(cause))),
      O.getOrElse(() => new InterruptedException())
   );
