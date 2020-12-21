import type { FiberId } from "../Fiber/FiberId";
import type { Trace } from "../Trace";
import type { Eq } from "@principia/base/data/Eq";
import type { NonEmptyArray } from "@principia/base/data/NonEmptyArray";
import type * as HKT from "@principia/base/HKT";

import * as A from "@principia/base/data/Array";
import * as E from "@principia/base/data/Either";
import { makeEq } from "@principia/base/data/Eq";
import { flow, identity, pipe } from "@principia/base/data/Function";
import * as F from "@principia/base/data/Function";
import * as O from "@principia/base/data/Option";

import { eqFiberId } from "../Fiber/FiberId";
import * as Sy from "../Sync";
import { prettyTrace } from "../Trace";

export type Cause<E> = Empty | Fail<E> | Die | Interrupt | Then<E> | Both<E> | Traced<E>;

export interface Empty {
  readonly _tag: "Empty";
}

export interface Fail<E> {
  readonly _tag: "Fail";
  readonly value: E;
}

export interface Die {
  readonly _tag: "Die";
  readonly value: unknown;
}

export interface Interrupt {
  readonly _tag: "Interrupt";
  readonly fiberId: FiberId;
}

export interface Then<E> {
  readonly _tag: "Then";
  readonly left: Cause<E>;
  readonly right: Cause<E>;
}

export interface Both<E> {
  readonly _tag: "Both";
  readonly left: Cause<E>;
  readonly right: Cause<E>;
}

export interface Traced<E> {
  readonly _tag: "Traced";
  readonly cause: Cause<E>;
  readonly trace: Trace;
}

export const URI = "Cause";

export type URI = typeof URI;

export type V = HKT.Auto;

/*
 * -------------------------------------------
 * Constructors
 * -------------------------------------------
 */

export const empty: Cause<never> = {
  _tag: "Empty"
};

/**
 * ```haskell
 * fail :: e -> Cause e
 * ```
 */
export function fail<E>(value: E): Cause<E> {
  return {
    _tag: "Fail",
    value
  };
}

/**
 * ```haskell
 * die :: _ -> Cause Never
 * ```
 */
export function die(value: unknown): Cause<never> {
  return {
    _tag: "Die",
    value
  };
}

/**
 * ```haskell
 * interrupt :: FiberId -> Cause Never
 * ```
 */
export function interrupt(fiberId: FiberId): Cause<never> {
  return {
    _tag: "Interrupt",
    fiberId
  };
}

/**
 * ```haskell
 * then :: Cause c => (c e, c f) -> c (e | f)
 * ```
 */
export function then<E, E1>(left: Cause<E>, right: Cause<E1>): Cause<E | E1> {
  return isEmpty(left) ? right : isEmpty(right) ? left : { _tag: "Then", left, right };
}

/**
 * ```haskell
 * both :: Cause c => (c e, c f) -> c (e | f)
 * ```
 */
export function both<E, E1>(left: Cause<E>, right: Cause<E1>): Cause<E | E1> {
  return isEmpty(left) ? right : isEmpty(right) ? left : { _tag: "Both", left, right };
}

export function traced<E>(cause: Cause<E>, trace: Trace): Cause<E> {
  return {
    _tag: "Traced",
    cause,
    trace
  };
}

/*
 * -------------------------------------------
 * Guards
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

/*
 * -------------------------------------------
 * Destructors
 * -------------------------------------------
 */

/**
 * @internal
 */
export function findSafe_<E, A>(
  cause: Cause<E>,
  f: (cause: Cause<E>) => O.Option<A>
): Sy.Sync<unknown, never, O.Option<A>> {
  return Sy.gen(function* (_) {
    const apply = f(cause);
    if (apply._tag === "Some") {
      return apply;
    }
    switch (cause._tag) {
      case "Then": {
        const isLeft = yield* _(findSafe_(cause.left, f));
        if (isLeft._tag === "Some") {
          return isLeft;
        } else {
          return yield* _(findSafe_(cause.right, f));
        }
      }
      case "Traced": {
        return yield* _(findSafe_(cause.cause, f));
      }
      case "Both": {
        const isLeft = yield* _(findSafe_(cause.left, f));
        if (isLeft._tag === "Some") {
          return isLeft;
        } else {
          return yield* _(findSafe_(cause.right, f));
        }
      }
      default: {
        return apply;
      }
    }
  });
}

export function find_<E, A>(cause: Cause<E>, f: (cause: Cause<E>) => O.Option<A>): O.Option<A> {
  return Sy.unsafeRun(findSafe_(cause, f));
}

/**
 * ```haskell
 * find :: (Cause c, Option m) => (c e -> m a) -> c e -> m a
 * ```
 *
 * Finds the first result matching f
 *
 * @category Combinators
 * @since 1.0.0
 */
export function find<A, E>(f: (cause: Cause<E>) => O.Option<A>): (cause: Cause<E>) => O.Option<A> {
  return (cause) => find_(cause, f);
}

/**
 * @internal
 */
export function foldSafe_<E, A>(
  cause: Cause<E>,
  onEmpty: () => A,
  onFail: (reason: E) => A,
  onDie: (reason: unknown) => A,
  onInterrupt: (id: FiberId) => A,
  onThen: (l: A, r: A) => A,
  onBoth: (l: A, r: A) => A,
  onTraced: (_: A, __: Trace) => A
): Sy.USync<A> {
  return Sy.gen(function* (_) {
    switch (cause._tag) {
      case "Empty":
        return onEmpty();
      case "Fail":
        return onFail(cause.value);
      case "Die":
        return onDie(cause.value);
      case "Interrupt":
        return onInterrupt(cause.fiberId);
      case "Both":
        return onBoth(
          yield* _(
            foldSafe_(cause.left, onEmpty, onFail, onDie, onInterrupt, onThen, onBoth, onTraced)
          ),
          yield* _(
            foldSafe_(cause.right, onEmpty, onFail, onDie, onInterrupt, onThen, onBoth, onTraced)
          )
        );
      case "Then":
        return onThen(
          yield* _(
            foldSafe_(cause.left, onEmpty, onFail, onDie, onInterrupt, onThen, onBoth, onTraced)
          ),
          yield* _(
            foldSafe_(cause.right, onEmpty, onFail, onDie, onInterrupt, onThen, onBoth, onTraced)
          )
        );
      case "Traced":
        return onTraced(
          yield* _(
            foldSafe_(cause.cause, onEmpty, onFail, onDie, onInterrupt, onThen, onBoth, onTraced)
          ),
          cause.trace
        );
    }
  });
}

/**
 * ```haskell
 * fold :: (
 *    (() -> a),
 *    (e -> a),
 *    (_ -> a),
 *    (FiberId -> a),
 *    ((a, a) -> a),
 *    ((a, a) -> a)
 * ) -> Cause e -> a
 * ```
 *
 * Folds over a cause
 *
 * @category Destructors
 * @since 1.0.0
 */
export function fold<E, A>(
  onEmpty: () => A,
  onFail: (reason: E) => A,
  onDie: (reason: unknown) => A,
  onInterrupt: (id: FiberId) => A,
  onThen: (l: A, r: A) => A,
  onBoth: (l: A, r: A) => A,
  onTraced: (_: A, __: Trace) => A
): (cause: Cause<E>) => A {
  return (cause) =>
    Sy.unsafeRun(foldSafe_(cause, onEmpty, onFail, onDie, onInterrupt, onThen, onBoth, onTraced));
}

/**
 * @internal
 */
export function foldLeftSafe_<E, B>(
  cause: Cause<E>,
  b: B,
  f: (b: B, cause: Cause<E>) => O.Option<B>
): Sy.USync<B> {
  return Sy.gen(function* (_) {
    const apply = O.getOrElse_(f(b, cause), () => b);
    switch (cause._tag) {
      case "Then": {
        const l = yield* _(foldLeftSafe_(cause.left, apply, f));
        const r = yield* _(foldLeftSafe_(cause.right, l, f));
        return r;
      }
      case "Both": {
        const l = yield* _(foldLeftSafe_(cause.left, apply, f));
        const r = yield* _(foldLeftSafe_(cause.right, l, f));
        return r;
      }
      case "Traced": {
        return yield* _(foldLeftSafe_(cause.cause, apply, f));
      }
      default: {
        return apply;
      }
    }
  });
}

/**
 * ```haskell
 * foldLeft_ :: (Cause c) => (c e, a, ((a, c e) -> Option a)) -> a
 * ```
 *
 * Accumulates a state over a Cause
 *
 * @category Destructors
 * @since 1.0.0
 */
export const foldLeft_ = F.trampoline(function loop<E, A>(
  cause: Cause<E>,
  a: A,
  f: (a: A, cause: Cause<E>) => O.Option<A>
): F.Trampoline<A> {
  const apply = O.getOrElse_(f(a, cause), () => a);
  return cause._tag === "Both" || cause._tag === "Then"
    ? F.more(() => loop(cause.right, foldLeft_(cause.left, apply, f), f))
    : cause._tag === "Traced"
    ? F.more(() => loop(cause.cause, apply, f))
    : F.done(apply);
});

/*
 * export const foldl_ = <E, B>(cause: Cause<E>, b: B, f: (b: B, cause: Cause<E>) => O.Option<B>): B =>
 *    Sy.runIO(foldlSafe_(cause, b, f));
 */

/**
 * ```haskell
 * foldLeft :: (Cause c) => (a, ((a, c e) -> Option a)) -> c e -> a
 * ```
 *
 * Accumulates a state over a Cause
 *
 * @category Destructors
 * @since 1.0.0
 */
export function foldLeft<E, A>(
  a: A,
  f: (a: A, cause: Cause<E>) => O.Option<A>
): (cause: Cause<E>) => A {
  return (cause) => foldLeft_(cause, a, f);
}

/**
 * ```haskell
 * interruptOption :: Cause e -> Option FiberId
 * ```
 *
 * Returns the `FiberID` associated with the first `Interrupt` in this `Cause` if one
 * exists.
 */
export function interruptOption<E>(cause: Cause<E>): O.Option<FiberId> {
  return find_(cause, (c) => (c._tag === "Interrupt" ? O.some(c.fiberId) : O.none()));
}

/**
 * ```haskell
 * failureOption :: Cause e -> Option e
 * ```
 *
 * Returns the `E` associated with the first `Fail` in this `Cause` if one
 * exists.
 */
export function failureOption<E>(cause: Cause<E>): O.Option<E> {
  return find_(cause, (c) => (c._tag === "Fail" ? O.some(c.value) : O.none()));
}

/**
 * ```haskell
 * dieOption :: Cause e -> Option _
 * ```
 *
 * Returns the `Error` associated with the first `Die` in this `Cause` if
 * one exists.
 */
export function dieOption<E>(cause: Cause<E>): O.Option<unknown> {
  return find_(cause, (c) => (c._tag === "Die" ? O.some(c.value) : O.none()));
}

/*
 * -------------------------------------------
 * Alt
 * -------------------------------------------
 */

/**
 * ```haskell
 * alt_ :: Alt f => (f a, (() -> f a)) -> f a
 * ```
 *
 * @category Alt
 * @since 1.0.0
 */
export function alt_<E>(fa: Cause<E>, that: () => Cause<E>): Cause<E> {
  return flatMap_(fa, () => that());
}

/**
 * ```haskell
 * alt :: Alt f => (() -> f a) -> fa -> f a
 * ```
 *
 * @category Alt
 * @since 1.0.0
 */
export function alt<E>(that: () => Cause<E>): (fa: Cause<E>) => Cause<E> {
  return (fa) => alt_(fa, that);
}

/*
 * -------------------------------------------
 * Applicative
 * -------------------------------------------
 */

/**
 * ```haskell
 * pure :: Applicative f => a -> f a
 * ```
 *
 * Lifts a pure expression info a `Cause`
 *
 * @category Applicative
 * @since 1.0.0
 */
export function pure<E>(e: E): Cause<E> {
  return fail(e);
}

/*
 * -------------------------------------------
 * Apply
 * -------------------------------------------
 */

/**
 * ```haskell
 * ap_ :: Apply f => (f (a -> b), f a) -> f b
 * ```
 *
 * Apply a function to an argument under a type constructor
 *
 * @category Apply
 * @since 1.0.0
 */
export function ap_<E, D>(fab: Cause<(a: E) => D>, fa: Cause<E>): Cause<D> {
  return flatMap_(fab, (f) => map_(fa, f));
}

/**
 * ```haskell
 * ap :: Apply f => f a -> f (a -> b) -> f b
 * ```
 *
 * Apply a function to an argument under a type constructor
 *
 * @category Apply
 * @since 1.0.0
 */
export function ap<E>(fa: Cause<E>): <D>(fab: Cause<(a: E) => D>) => Cause<D> {
  return (fab) => ap_(fab, fa);
}

/*
 * -------------------------------------------
 * Eq
 * -------------------------------------------
 */

export function equalsCause<E>(x: Cause<E>, y: Cause<E>): boolean {
  switch (x._tag) {
    case "Fail": {
      return y._tag === "Fail" && x.value === y.value;
    }
    case "Empty": {
      return y._tag === "Empty";
    }
    case "Die": {
      return (
        y._tag === "Die" &&
        ((x.value instanceof Error &&
          y.value instanceof Error &&
          x.value.name === y.value.name &&
          x.value.message === y.value.message) ||
          x.value === y.value)
      );
    }
    case "Interrupt": {
      return y._tag === "Interrupt" && eqFiberId.equals(x.fiberId)(y.fiberId);
    }
    case "Both": {
      return y._tag === "Both" && equalsCause(x.left, y.left) && equalsCause(x.right, y.right);
    }
    case "Then": {
      return y._tag === "Then" && equalsCause(x.left, y.left) && equalsCause(x.right, y.right);
    }
    case "Traced": {
      return equalsCause(x.cause, y);
    }
  }
}

export const eqCause: Eq<Cause<any>> = makeEq(equalsCause);

/*
 * -------------------------------------------
 * Functor
 * -------------------------------------------
 */

/**
 * ```haskell
 * map_ :: Functor f => (f a, (a -> b)) -> f b
 * ```
 *
 * Lifts a function a -> b to a function f a -> f b
 *
 * @category Functor
 * @since 1.0.0
 */
export function map_<E, D>(fa: Cause<E>, f: (e: E) => D) {
  return flatMap_(fa, (e) => fail(f(e)));
}

/**
 * ```haskell
 * map :: Functor f => (a -> b) -> f a -> f b
 * ```
 *
 * lifts a function a -> b to a function f a -> f b
 *
 * @category Functor
 * @since 1.0.0
 */
export function map<E, D>(f: (e: E) => D): (fa: Cause<E>) => Cause<D> {
  return (fa) => map_(fa, f);
}

/*
 * -------------------------------------------
 * Monad
 * -------------------------------------------
 */

export function flatMapSafe_<E, D>(
  ma: Cause<E>,
  f: (e: E) => Cause<D>
): Sy.Sync<unknown, never, Cause<D>> {
  return Sy.gen(function* (_) {
    switch (ma._tag) {
      case "Empty":
        return empty;
      case "Fail":
        return f(ma.value);
      case "Die":
        return ma;
      case "Interrupt":
        return ma;
      case "Then":
        return then(yield* _(flatMapSafe_(ma.left, f)), yield* _(flatMapSafe_(ma.right, f)));
      case "Both":
        return both(yield* _(flatMapSafe_(ma.left, f)), yield* _(flatMapSafe_(ma.right, f)));
      case "Traced":
        return traced(yield* _(flatMapSafe_(ma.cause, f)), ma.trace);
    }
  });
}

/**
 * ```haskell
 * chain_ :: Monad m => (m a, (a -> m b)) -> m b
 * ```
 *
 * Composes computations in sequence, using the return value of one computation as input for the next
 *
 * @category Monad
 * @since 1.0.0
 */
export function flatMap_<E, D>(ma: Cause<E>, f: (e: E) => Cause<D>): Cause<D> {
  return Sy.unsafeRun(flatMapSafe_(ma, f));
}

/**
 * ```haskell
 * chain :: Monad m => (a -> m b) -> m a -> m b
 * ```
 *
 * Composes computations in sequence, using the return value of one computation as input for the next
 *
 * @category Monad
 * @since 1.0.0
 */
export function flatMap<E, D>(f: (e: E) => Cause<D>): (ma: Cause<E>) => Cause<D> {
  return (ma) => flatMap_(ma, f);
}

/**
 * ```haskell
 * flatten :: Monad m => m m a -> m a
 * ```
 *
 * Removes one level of nesting from a nested `Cuase`
 *
 * @category Monad
 * @since 1.0.0
 */
export function flatten<E>(mma: Cause<Cause<E>>): Cause<E> {
  return flatMap_(mma, identity);
}

/*
 * -------------------------------------------
 * Unit
 * -------------------------------------------
 */

export function unit(): Cause<void> {
  return fail(undefined);
}

/*
 * -------------------------------------------
 * Combinators
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
      case "Traced": {
        return traced(yield* _(stripFailuresSafe(cause.cause)), cause.trace);
      }
    }
  });
}

/**
 * Discards all typed failures kept on this `Cause`.
 */
export function stripFailures<E>(cause: Cause<E>): Cause<never> {
  return Sy.unsafeRun(stripFailuresSafe(cause));
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
      case "Traced": {
        return traced(yield* _(stripInterruptsSafe(cause.cause)), cause.trace);
      }
    }
  });
}

/**
 * Discards all interrupts kept on this `Cause`.
 */
export function stripInterrupts<E>(cause: Cause<E>): Cause<E> {
  return Sy.unsafeRun(stripInterruptsSafe(cause));
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
      case "Traced": {
        return O.map_(yield* _(keepDefectsSafe(cause.cause)), (_) => traced(_, cause.trace));
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
  return Sy.unsafeRun(keepDefectsSafe(cause));
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
      case "Traced": {
        return E.mapLeft_(yield* _(sequenceCauseEitherSafe(cause.cause)), (_) =>
          traced(_, cause.trace)
        );
      }
    }
  });
}

/**
 * Converts the specified `Cause<Either<E, A>>` to an `Either<Cause<E>, A>`.
 */
export function sequenceCauseEither<E, A>(cause: Cause<E.Either<E, A>>): E.Either<Cause<E>, A> {
  return Sy.unsafeRun(sequenceCauseEitherSafe(cause));
}

export function sequenceCauseOptionSafe<E>(
  cause: Cause<O.Option<E>>
): Sy.USync<O.Option<Cause<E>>> {
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
      case "Traced": {
        return O.map_(yield* _(sequenceCauseOptionSafe(cause.cause)), (_) =>
          traced(_, cause.trace)
        );
      }
    }
  });
}

/**
 * Converts the specified `Cause<Option<E>>` to an `Option<Cause<E>>`.
 */
export function sequenceCauseOption<E>(cause: Cause<O.Option<E>>): O.Option<Cause<E>> {
  return Sy.unsafeRun(sequenceCauseOptionSafe(cause));
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

/**
 * Returns a `Cause` that has been stripped of all tracing information.
 */
export function untraced<E>(cause: Cause<E>): Cause<E> {
  return Sy.unsafeRun(untracedSafe(cause));
}

/**
 * Returns a `Cause` that has been stripped of all tracing information.
 */
export function untracedSafe<E>(cause: Cause<E>): Sy.USync<Cause<E>> {
  return Sy.gen(function* (_) {
    switch (cause._tag) {
      case "Traced": {
        return yield* _(untracedSafe(cause.cause));
      }
      case "Both": {
        return both(yield* _(untracedSafe(cause.left)), yield* _(untracedSafe(cause.right)));
      }
      case "Then": {
        return then(yield* _(untracedSafe(cause.left)), yield* _(untracedSafe(cause.right)));
      }
      default: {
        return cause;
      }
    }
  });
}

/*
 * -------------------------------------------
 * Errors
 * -------------------------------------------
 */

export class FiberFailure<E> extends Error {
  readonly _tag = "FiberFailure";
  readonly pretty = pretty(this.cause);

  constructor(readonly cause: Cause<E>) {
    super();

    this.name = this._tag;
    this.stack = undefined;
  }
}

export function isFiberFailure(u: unknown): u is FiberFailure<unknown> {
  return u instanceof Error && u["_tag"] === "FiberFailure";
}

export class Untraced extends Error {
  readonly _tag = "Untraced";

  constructor(message?: string) {
    super(message);
    this.name = this._tag;
    this.stack = undefined;
  }
}

export function isUntraced(u: unknown): u is Untraced {
  return u instanceof Error && u["_tag"] === "Untraced";
}

export class RuntimeError extends Error {
  readonly _tag = "RuntimeError";

  constructor(message?: string) {
    super(message);

    this.name = this._tag;
  }
}

export function isRuntime(u: unknown): u is RuntimeError {
  return u instanceof Error && u["_tag"] === "RuntimeError";
}

export class InterruptedException extends Error {
  readonly _tag = "InterruptedException";

  constructor(message?: string) {
    super(message);
    this.name = this._tag;
  }
}

export function isInterruptedException(u: unknown): u is InterruptedException {
  return u instanceof Error && u["_tag"] === "InterruptedException";
}

export class IllegalStateException extends Error {
  readonly _tag = "IllegalStateException";

  constructor(message?: string) {
    super(message);
    this.name = this._tag;
  }
}

export function isIllegalStateException(u: unknown): u is IllegalStateException {
  return u instanceof Error && u["_tag"] === "IllegalStateException";
}

export class IllegalArgumentException extends Error {
  readonly _tag = "IllegalArgumentException";
  constructor(message?: string) {
    super(message);
    this.name = this._tag;
  }
}

export function isIllegalArgumentException(u: unknown): u is IllegalArgumentException {
  return u instanceof Error && u["_tag"] === "IllegalArgumentException";
}

/*
 * -------------------------------------------
 * Render
 * -------------------------------------------
 */

type Segment = Sequential | Parallel | Failure;

type Step = Parallel | Failure;

interface Failure {
  _tag: "Failure";
  lines: string[];
}

interface Parallel {
  _tag: "Parallel";
  all: Sequential[];
}

interface Sequential {
  _tag: "Sequential";
  all: Step[];
}

const Failure = (lines: string[]): Failure => ({
  _tag: "Failure",
  lines
});

const Sequential = (all: Step[]): Sequential => ({
  _tag: "Sequential",
  all
});

const Parallel = (all: Sequential[]): Parallel => ({
  _tag: "Parallel",
  all
});

const headTail = <A>(a: NonEmptyArray<A>): [A, A[]] => {
  const x = [...a];
  const head = x.shift() as A;
  return [head, x];
};

export type Renderer = (_: Trace) => string;

const lines = (s: string) => s.split("\n").map((s) => s.replace("\r", "")) as string[];

const prefixBlock = (values: readonly string[], p1: string, p2: string): string[] =>
  A.isNonEmpty(values)
    ? pipe(headTail(values), ([head, tail]) => [`${p1}${head}`, ...tail.map((_) => `${p2}${_}`)])
    : [];

function renderTrace(trace: O.Option<Trace>, renderer: Renderer) {
  return trace._tag === "None" ? ["No Trace available."] : lines(renderer(trace.value));
}

const renderInterrupt = (
  fiberId: FiberId,
  trace: O.Option<Trace>,
  renderer: Renderer
): Sequential =>
  Sequential([
    Failure([
      `An interrupt was produced by #${fiberId.seqNumber}.`,
      "",
      ...renderTrace(trace, renderer)
    ])
  ]);

const renderError = (error: Error): string[] => lines(error.stack ? error.stack : String(error));

const renderDie = (error: Error, trace: O.Option<Trace>, renderer: Renderer): Sequential =>
  Sequential([
    Failure([
      "An unchecked error was produced.",
      "",
      ...renderError(error),
      ...renderTrace(trace, renderer)
    ])
  ]);

const renderDieUnknown = (
  error: string[],
  trace: O.Option<Trace>,
  renderer: Renderer
): Sequential =>
  Sequential([
    Failure(["An unchecked error was produced.", "", ...error, ...renderTrace(trace, renderer)])
  ]);

const renderFail = (error: string[], trace: O.Option<Trace>, renderer: Renderer): Sequential =>
  Sequential([
    Failure(["A checked error was not handled.", "", ...error, ...renderTrace(trace, renderer)])
  ]);

const renderFailError = (error: Error, trace: O.Option<Trace>, renderer: Renderer): Sequential =>
  Sequential([
    Failure([
      "A checked error was not handled.",
      "",
      ...renderError(error),
      ...renderTrace(trace, renderer)
    ])
  ]);

const causeToSequential = <E>(cause: Cause<E>, renderer: Renderer): Sy.USync<Sequential> =>
  Sy.gen(function* (_) {
    switch (cause._tag) {
      case "Empty": {
        return Sequential([]);
      }
      case "Fail": {
        return cause.value instanceof Error
          ? renderFailError(cause.value, O.none(), renderer)
          : renderFail(lines(JSON.stringify(cause.value, null, 2)), O.none(), renderer);
      }
      case "Die": {
        return cause.value instanceof Error
          ? renderDie(cause.value, O.none(), renderer)
          : renderDieUnknown(lines(JSON.stringify(cause.value, null, 2)), O.none(), renderer);
      }
      case "Interrupt": {
        return renderInterrupt(cause.fiberId, O.none(), renderer);
      }
      case "Then": {
        return Sequential(yield* _(linearSegments(cause, renderer)));
      }
      case "Both": {
        return Sequential([Parallel(yield* _(parallelSegments(cause, renderer)))]);
      }
      case "Traced": {
        switch (cause.cause._tag) {
          case "Fail": {
            return cause.cause.value instanceof Error
              ? renderFailError(cause.cause.value, O.some(cause.trace), renderer)
              : renderFail(
                  lines(JSON.stringify(cause.cause.value, null, 2)),
                  O.some(cause.trace),
                  renderer
                );
          }
          case "Die": {
            return cause.cause.value instanceof Error
              ? renderDie(cause.cause.value, O.some(cause.trace), renderer)
              : renderDieUnknown(
                  lines(JSON.stringify(cause.cause.value, null, 2)),
                  O.some(cause.trace),
                  renderer
                );
          }
          case "Interrupt": {
            return renderInterrupt(cause.cause.fiberId, O.some(cause.trace), renderer);
          }
          default: {
            return Sequential([
              Failure([
                "An error was rethrown with a new trace.",
                ...renderTrace(O.some(cause.trace), renderer)
              ]),
              ...(yield* _(causeToSequential(cause.cause, renderer))).all
            ]);
          }
        }
      }
    }
  });

const linearSegments = <E>(cause: Cause<E>, renderer: Renderer): Sy.USync<Step[]> =>
  Sy.gen(function* (_) {
    switch (cause._tag) {
      case "Then": {
        return [
          ...(yield* _(linearSegments(cause.left, renderer))),
          ...(yield* _(linearSegments(cause.right, renderer)))
        ];
      }
      default: {
        return (yield* _(causeToSequential(cause, renderer))).all;
      }
    }
  });

const parallelSegments = <E>(cause: Cause<E>, renderer: Renderer): Sy.USync<Sequential[]> =>
  Sy.gen(function* (_) {
    switch (cause._tag) {
      case "Both": {
        return [
          ...(yield* _(parallelSegments(cause.left, renderer))),
          ...(yield* _(parallelSegments(cause.right, renderer)))
        ];
      }
      default: {
        return [yield* _(causeToSequential(cause, renderer))];
      }
    }
  });

const times = (s: string, n: number) => {
  let h = "";

  for (let i = 0; i < n; i += 1) {
    h += s;
  }

  return h;
};

const format = (segment: Segment): readonly string[] => {
  switch (segment._tag) {
    case "Failure": {
      return prefixBlock(segment.lines, "─", " ");
    }
    case "Parallel": {
      return [
        times("══╦", segment.all.length - 1) + "══╗",
        ...A.foldRight_(segment.all, [] as string[], (current, acc) => [
          ...prefixBlock(acc, "  ║", "  ║"),
          ...prefixBlock(format(current), "  ", "  ")
        ])
      ];
    }
    case "Sequential": {
      return A.flatMap_(segment.all, (seg) => ["║", ...prefixBlock(format(seg), "╠", "║"), "▼"]);
    }
  }
};

const prettyLines = <E>(cause: Cause<E>, renderer: Renderer): Sy.USync<readonly string[]> =>
  Sy.gen(function* (_) {
    const s = yield* _(causeToSequential(cause, renderer));

    if (s.all.length === 1 && s.all[0]._tag === "Failure") {
      return s.all[0].lines;
    }

    return O.getOrElse_(A.updateAt(0, "╥")(format(s)), (): string[] => []);
  });

export function prettyM<E>(cause: Cause<E>, renderer: Renderer): Sy.USync<string> {
  return Sy.gen(function* (_) {
    const lines = yield* _(prettyLines(cause, renderer));
    return lines.join("\n");
  });
}

export function pretty<E>(cause: Cause<E>, renderer: Renderer = prettyTrace): string {
  return Sy.unsafeRun(prettyM(cause, renderer));
}
