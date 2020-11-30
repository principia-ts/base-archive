import * as A from "../../Array/_core";
import * as E from "../../Either";
import { pipe } from "../../Function";
import * as O from "../../Option";
import * as Sy from "../../Sync";
import type { FiberId } from "../Fiber/FiberId";
import { both, fail, then } from "./constructors";
import { failureOption, find, foldLeft_ } from "./destructors";
import { empty } from "./empty";
import { InterruptedException } from "./errors";
import { map } from "./functor";
import { died, failed, interrupted } from "./guards";
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
export function as<E1>(e: E1): <E>(fa: Cause<E>) => Cause<E1> {
  return map(() => e);
}

/**
 * Extracts a list of non-recoverable errors from the `Cause`.
 */
export function defects<E>(cause: Cause<E>): ReadonlyArray<unknown> {
  return foldLeft_(cause, [] as ReadonlyArray<unknown>, (a, c) =>
    c._tag === "Die" ? O.some([...a, c.value]) : O.none()
  );
}

/**
 * Produces a list of all recoverable errors `E` in the `Cause`.
 */
export function failures<E>(cause: Cause<E>): ReadonlyArray<E> {
  return foldLeft_(cause, [] as readonly E[], (a, c) =>
    c._tag === "Fail" ? O.some([...a, c.value]) : O.none()
  );
}

/**
 * Returns a set of interruptors, fibers that interrupted the fiber described
 * by this `Cause`.
 */
export function interruptors<E>(cause: Cause<E>): ReadonlySet<FiberId> {
  return foldLeft_(cause, new Set(), (s, c) =>
    c._tag === "Interrupt" ? O.some(s.add(c.fiberId)) : O.none()
  );
}

/**
 * Determines if the `Cause` contains only interruptions and not any `Die` or
 * `Fail` causes.
 */
export function interruptedOnly<E>(cause: Cause<E>): boolean {
  return pipe(
    cause,
    find((c) => (died(c) || failed(c) ? O.some(false) : O.none())),
    O.getOrElse(() => true)
  );
}

/**
 * @internal
 */
export function stripFailuresSafe<E>(cause: Cause<E>): Sy.USync<Cause<never>> {
  return Sy.gen(function* (_) {
    switch (cause._tag) {
      case "Empty": {
        return empty;
      }
      case "Fail": {
        return empty;
      }
      case "Interrupt": {
        return cause;
      }
      case "Die": {
        return cause;
      }
      case "Both": {
        return both(
          yield* _(stripFailuresSafe(cause.left)),
          yield* _(stripFailuresSafe(cause.right))
        );
      }
      case "Then": {
        return then(
          yield* _(stripFailuresSafe(cause.left)),
          yield* _(stripFailuresSafe(cause.right))
        );
      }
    }
  });
}

/**
 * Discards all typed failures kept on this `Cause`.
 */
export function stripFailures<E>(cause: Cause<E>): Cause<never> {
  return Sy.runIO(stripFailuresSafe(cause));
}

/**
 * @internal
 */
export function stripInterruptsSafe<E>(cause: Cause<E>): Sy.USync<Cause<E>> {
  return Sy.gen(function* (_) {
    switch (cause._tag) {
      case "Empty": {
        return empty;
      }
      case "Fail": {
        return cause;
      }
      case "Interrupt": {
        return empty;
      }
      case "Die": {
        return cause;
      }
      case "Both": {
        return both(
          yield* _(stripInterruptsSafe(cause.left)),
          yield* _(stripInterruptsSafe(cause.right))
        );
      }
      case "Then": {
        return then(
          yield* _(stripInterruptsSafe(cause.left)),
          yield* _(stripInterruptsSafe(cause.right))
        );
      }
    }
  });
}

/**
 * Discards all interrupts kept on this `Cause`.
 */
export function stripInterrupts<E>(cause: Cause<E>): Cause<E> {
  return Sy.runIO(stripInterruptsSafe(cause));
}

/**
 * @internal
 */
export function keepDefectsSafe<E>(cause: Cause<E>): Sy.USync<O.Option<Cause<never>>> {
  return Sy.gen(function* (_) {
    switch (cause._tag) {
      case "Empty": {
        return O.none();
      }
      case "Fail": {
        return O.none();
      }
      case "Interrupt": {
        return O.none();
      }
      case "Die": {
        return O.some(cause);
      }
      case "Then": {
        const lefts = yield* _(keepDefectsSafe(cause.left));
        const rights = yield* _(keepDefectsSafe(cause.right));

        if (lefts._tag === "Some" && rights._tag === "Some") {
          return O.some(then(lefts.value, rights.value));
        } else if (lefts._tag === "Some") {
          return lefts;
        } else if (rights._tag === "Some") {
          return rights;
        } else {
          return O.none();
        }
      }
      case "Both": {
        const lefts = yield* _(keepDefectsSafe(cause.left));
        const rights = yield* _(keepDefectsSafe(cause.right));

        if (lefts._tag === "Some" && rights._tag === "Some") {
          return O.some(both(lefts.value, rights.value));
        } else if (lefts._tag === "Some") {
          return lefts;
        } else if (rights._tag === "Some") {
          return rights;
        } else {
          return O.none();
        }
      }
    }
  });
}

/**
 * Remove all `Fail` and `Interrupt` nodes from this `Cause`,
 * return only `Die` cause/finalizer defects.
 */
export function keepDefects<E>(cause: Cause<E>): O.Option<Cause<never>> {
  return Sy.runIO(keepDefectsSafe(cause));
}

export function sequenceCauseEitherSafe<E, A>(
  cause: Cause<E.Either<E, A>>
): Sy.USync<E.Either<Cause<E>, A>> {
  return Sy.gen(function* (_) {
    switch (cause._tag) {
      case "Empty": {
        return E.left(empty);
      }
      case "Interrupt": {
        return E.left(cause);
      }
      case "Fail": {
        return cause.value._tag === "Left"
          ? E.left(fail(cause.value.left))
          : E.right(cause.value.right);
      }
      case "Die": {
        return E.left(cause);
      }
      case "Then": {
        const lefts = yield* _(sequenceCauseEitherSafe(cause.left));
        const rights = yield* _(sequenceCauseEitherSafe(cause.right));

        return lefts._tag === "Left"
          ? rights._tag === "Right"
            ? E.right(rights.right)
            : E.left(then(lefts.left, rights.left))
          : E.right(lefts.right);
      }
      case "Both": {
        const lefts = yield* _(sequenceCauseEitherSafe(cause.left));
        const rights = yield* _(sequenceCauseEitherSafe(cause.right));

        return lefts._tag === "Left"
          ? rights._tag === "Right"
            ? E.right(rights.right)
            : E.left(both(lefts.left, rights.left))
          : E.right(lefts.right);
      }
    }
  });
}

/**
 * Converts the specified `Cause<Either<E, A>>` to an `Either<Cause<E>, A>`.
 */
export function sequenceCauseEither<E, A>(cause: Cause<E.Either<E, A>>): E.Either<Cause<E>, A> {
  return Sy.runIO(sequenceCauseEitherSafe(cause));
}

export function sequenceCauseOptionSafe<E>(cause: Cause<O.Option<E>>): Sy.USync<O.Option<Cause<E>>> {
  return Sy.gen(function* (_) {
    switch (cause._tag) {
      case "Empty": {
        return O.some(empty);
      }
      case "Interrupt": {
        return O.some(cause);
      }
      case "Fail": {
        return O.map_(cause.value, fail);
      }
      case "Die": {
        return O.some(cause);
      }
      case "Then": {
        const lefts = yield* _(sequenceCauseOptionSafe(cause.left));
        const rights = yield* _(sequenceCauseOptionSafe(cause.right));
        return lefts._tag === "Some"
          ? rights._tag === "Some"
            ? O.some(then(lefts.value, rights.value))
            : lefts
          : rights._tag === "Some"
          ? rights
          : O.none();
      }
      case "Both": {
        const lefts = yield* _(sequenceCauseOptionSafe(cause.left));
        const rights = yield* _(sequenceCauseOptionSafe(cause.right));
        return lefts._tag === "Some"
          ? rights._tag === "Some"
            ? O.some(both(lefts.value, rights.value))
            : lefts
          : rights._tag === "Some"
          ? rights
          : O.none();
      }
    }
  });
}

/**
 * Converts the specified `Cause<Option<E>>` to an `Option<Cause<E>>`.
 */
export function sequenceCauseOption<E>(cause: Cause<O.Option<E>>): O.Option<Cause<E>> {
  return Sy.runIO(sequenceCauseOptionSafe(cause));
}

/**
 * Retrieve the first checked error on the `Left` if available,
 * if there are no checked errors return the rest of the `Cause`
 * that is known to contain only `Die` or `Interrupt` causes.
 * */
export function failureOrCause<E>(cause: Cause<E>): E.Either<E, Cause<never>> {
  return pipe(
    cause,
    failureOption,
    O.map(E.left),
    O.getOrElse(() => E.right(cause as Cause<never>)) // no E inside this cause, can safely cast
  );
}

/**
 * Squashes a `Cause` down to a single `Throwable`, chosen to be the
 * "most important" `Throwable`.
 */
export function squash<E>(f: (e: E) => unknown): (cause: Cause<E>) => unknown {
  return (cause) =>
    pipe(
      cause,
      failureOption,
      O.map(f),
      O.alt(() =>
        interrupted(cause)
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
}
