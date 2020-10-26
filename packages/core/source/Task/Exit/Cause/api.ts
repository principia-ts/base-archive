import { matchTag } from "@principia/prelude/Utils";

import * as A from "../../../Array";
import type { Either } from "../../../Either";
import * as E from "../../../Either";
import { flow, identity, pipe } from "../../../Function";
import type { Option } from "../../../Option";
import * as O from "../../../Option";
import { none, some } from "../../../Option";
import type { FiberId } from "../../Fiber/FiberId";
import { InterruptedException } from "./errors";
import { equalsCause } from "./instances";
import type { Both, Cause, Then } from "./model";

export const empty: Cause<never> = {
   _tag: "Empty"
};

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
export const find = <A, E>(f: (cause: Cause<E>) => Option<A>) => (cause: Cause<E>): Option<A> => {
   const apply = f(cause);

   if (apply._tag === "Some") {
      return apply;
   }

   switch (cause._tag) {
      case "Then": {
         const isLeft = find(f)(cause.left);
         if (isLeft._tag === "Some") {
            return isLeft;
         } else {
            return find(f)(cause.right);
         }
      }
      case "Both": {
         const isLeft = find(f)(cause.left);
         if (isLeft._tag === "Some") {
            return isLeft;
         } else {
            return find(f)(cause.right);
         }
      }
      default: {
         return apply;
      }
   }
};

/*
 * -------------------------------------------
 * Destructors
 * -------------------------------------------
 */

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
export const fold = <E, A>(
   onEmpty: () => A,
   onFail: (reason: E) => A,
   onDie: (reason: unknown) => A,
   onInterrupt: (id: FiberId) => A,
   onThen: (l: A, r: A) => A,
   onBoth: (l: A, r: A) => A
): ((cause: Cause<E>) => A) =>
   matchTag({
      Empty: (_) => onEmpty(),
      Fail: (c) => onFail(c.value),
      Die: (c) => onDie(c.value),
      Interrupt: (c) => onInterrupt(c.fiberId),
      Both: (c) =>
         onBoth(
            fold(onEmpty, onFail, onDie, onInterrupt, onThen, onBoth)(c.left),
            fold(onEmpty, onFail, onDie, onInterrupt, onThen, onBoth)(c.right)
         ),
      Then: (c) =>
         onThen(
            fold(onEmpty, onFail, onDie, onInterrupt, onThen, onBoth)(c.left),
            fold(onEmpty, onFail, onDie, onInterrupt, onThen, onBoth)(c.right)
         )
   });

/**
 * ```haskell
 * foldl_ :: (Cause c) => (c e, a, ((a, c e) -> Option a)) -> a
 * ```
 *
 * Accumulates a state over a Cause
 *
 * @category Destructors
 * @since 1.0.0
 */
export const foldl_ = <E, A>(cause: Cause<E>, a: A, f: (a: A, cause: Cause<E>) => O.Option<A>): A => {
   const apply = O.getOrElse_(f(a, cause), () => a);
   return cause._tag === "Both" || cause._tag === "Then" ? foldl_(cause.right, foldl_(cause.left, apply, f), f) : apply;
};

/**
 * ```haskell
 * foldl :: (Cause c) => (a, ((a, c e) -> Option a)) -> c e -> a
 * ```
 *
 * Accumulates a state over a Cause
 *
 * @category Destructors
 * @since 1.0.0
 */
export const foldl = <E, A>(a: A, f: (a: A, cause: Cause<E>) => O.Option<A>) => (cause: Cause<E>): A =>
   foldl_(cause, a, f);

/*
 * -------------------------------------------
 * Guards
 * -------------------------------------------
 */

/**
 * ```haskell
 * isEmpty :: Cause e -> Boolean
 * ```
 */
export const isEmpty = <E>(cause: Cause<E>) =>
   equalsCause(cause, empty) ||
   foldl_(cause, true as boolean, (acc, c) =>
      pipe(
         c,
         matchTag({
            Empty: () => some(acc),
            Die: () => some(false),
            Fail: () => some(false),
            Interrupt: () => some(false),
            Then: () => none(),
            Both: () => none()
         })
      )
   );

/**
 * ```haskell
 * dieOption :: Cause e -> Option _
 * ```
 *
 * Returns the `Error` associated with the first `Die` in this `Cause` if
 * one exists.
 */
export const dieOption: <E>(cause: Cause<E>) => Option<unknown> = find((c) =>
   c._tag === "Die" ? some(c.value) : none()
);

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
 * failureOption :: Cause e -> Option e
 * ```
 *
 * Returns the `E` associated with the first `Fail` in this `Cause` if one
 * exists.
 */
export const failureOption: <E>(cause: Cause<E>) => Option<E> = find((c) =>
   c._tag === "Fail" ? some(c.value) : none()
);

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

/*
 * -------------------------------------------
 * Constructors
 * -------------------------------------------
 */

/**
 * ```haskell
 * fail :: e -> Cause e
 * ```
 */
export const fail = <E>(value: E): Cause<E> => ({
   _tag: "Fail",
   value
});

/**
 * ```haskell
 * die :: _ -> Cause Never
 * ```
 */
export const die = (value: unknown): Cause<never> => ({
   _tag: "Die",
   value
});

/**
 * ```haskell
 * interrupt :: FiberId -> Cause Never
 * ```
 */
export const interrupt = (fiberId: FiberId): Cause<never> => ({
   _tag: "Interrupt",
   fiberId
});

/**
 * ```haskell
 * then :: Cause c => (c e, c f) -> c (e | f)
 * ```
 */
export const then = <E, E1>(left: Cause<E>, right: Cause<E1>): Cause<E | E1> =>
   isEmpty(left) ? right : isEmpty(right) ? left : { _tag: "Then", left, right };

/**
 * ```haskell
 * both :: Cause c => (c e, c f) -> c (e | f)
 * ```
 */
export const both = <E, E1>(left: Cause<E>, right: Cause<E1>): Cause<E | E1> =>
   isEmpty(left) ? right : isEmpty(right) ? left : { _tag: "Both", left, right };

/**
 * ```haskell
 * interruptOption :: Cause e -> Option FiberId
 * ```
 *
 * Returns the `FiberID` associated with the first `Interrupt` in this `Cause` if one
 * exists.
 */
export const interruptOption: <E>(cause: Cause<E>) => Option<FiberId> = find((c) =>
   c._tag === "Interrupt" ? some(c.fiberId) : none()
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
   equalsCause(that, cause) || foldl_(cause, false as boolean, (_, c) => (equalsCause(that, c) ? some(true) : none()));

/*
 * -------------------------------------------
 * Methods
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
export const pure = <E>(e: E): Cause<E> => fail(e);

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
export const chain_ = <E, D>(fa: Cause<E>, f: (e: E) => Cause<D>): Cause<D> => {
   switch (fa._tag) {
      case "Empty":
         return empty;
      case "Fail":
         return f(fa.value);
      case "Die":
         return fa;
      case "Interrupt":
         return fa;
      case "Then":
         return then(chain_(fa.left, f), chain_(fa.right, f));
      case "Both":
         return both(chain_(fa.left, f), chain_(fa.right, f));
   }
};

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
export const chain = <E, D>(f: (e: E) => Cause<D>) => (fa: Cause<E>) => chain_(fa, f);

/**
 * ```haskell
 * bind :: Monad m => m a -> (a -> m b) -> m b
 * ```
 *
 * A version of `chain` where the arguments are flipped
 * Composes computations in sequence, using the return value of one computation as input for the next
 *
 * @category Monad
 * @since 1.0.0
 */
// export const bind: TC.BindFn<[URI], V> = (fa) => (f) => chain_(fa, f);

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
export const map_ = <E, D>(fa: Cause<E>, f: (e: E) => D) => chain_(fa, (e) => fail(f(e)));

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
export const map = <E, D>(f: (e: E) => D) => (fa: Cause<E>) => map_(fa, f);

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
 * ```haskell
 * alt_ :: Alt f => (f a, (() -> f a)) -> f a
 * ```
 *
 * @category Alt
 * @since 1.0.0
 */
export const alt_ = <E>(fa: Cause<E>, that: () => Cause<E>) => chain_(fa, () => that());

/**
 * ```haskell
 * alt :: Alt f => (() -> f a) -> fa -> f a
 * ```
 *
 * @category Alt
 * @since 1.0.0
 */
export const alt = <E>(that: () => Cause<E>) => (fa: Cause<E>) => alt_(fa, that);

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
export const flatten = <E>(ffa: Cause<Cause<E>>) => chain_(ffa, identity);

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
export const ap_ = <E, D>(fab: Cause<(a: E) => D>, fa: Cause<E>) => chain_(fab, (f) => map_(fa, f));

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
export const ap = <E>(fa: Cause<E>) => <D>(fab: Cause<(a: E) => D>) => ap_(fab, fa);

/*
 * -------------------------------------------
 * Combinators
 * -------------------------------------------
 */

/**
 * Extracts a list of non-recoverable errors from the `Cause`.
 */
export const defects = <E>(cause: Cause<E>): ReadonlyArray<unknown> =>
   foldl_(cause, [] as ReadonlyArray<unknown>, (a, c) => (c._tag === "Die" ? some([...a, c.value]) : none()));

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
      find((c) => (isDie(c) || didFail(c) ? some(false) : none())),
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
export const keepDefects: <E>(cause: Cause<E>) => Option<Cause<never>> = matchTag({
   Empty: () => none(),
   Fail: () => none(),
   Interrupt: () => none(),
   Die: (c) => some(c),
   Then: (c) => {
      const lefts = keepDefects(c.left);
      const rights = keepDefects(c.right);
      return lefts._tag === "Some"
         ? rights._tag === "Some"
            ? some(then(lefts.value, rights.value))
            : lefts
         : rights._tag === "Some"
         ? rights
         : none();
   },
   Both: (c) => {
      const lefts = keepDefects(c.left);
      const rights = keepDefects(c.right);
      return lefts._tag === "Some"
         ? rights._tag === "Some"
            ? some(both(lefts.value, rights.value))
            : lefts
         : rights._tag === "Some"
         ? rights
         : none();
   }
});

/**
 * Converts the specified `Cause<Either<E, A>>` to an `Either<Cause<E>, A>`.
 */
export const sequenceCauseEither: <E, A>(c: Cause<Either<E, A>>) => Either<Cause<E>, A> = matchTag({
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
export const sequenceCauseOption: <E>(c: Cause<Option<E>>) => Option<Cause<E>> = matchTag({
   Empty: () => some(empty),
   Interrupt: (c) => some(c),
   Fail: (c) => O.map_(c.value, fail),
   Die: (c) => some(c),
   Then: (c) => {
      const lefts = sequenceCauseOption(c.left);
      const rights = sequenceCauseOption(c.right);
      return lefts._tag === "Some"
         ? rights._tag === "Some"
            ? some(then(lefts.value, rights.value))
            : lefts
         : rights._tag === "Some"
         ? rights
         : none();
   },
   Both: (c) => {
      const lefts = sequenceCauseOption(c.left);
      const rights = sequenceCauseOption(c.right);
      return lefts._tag === "Some"
         ? rights._tag === "Some"
            ? some(both(lefts.value, rights.value))
            : lefts
         : rights._tag === "Some"
         ? rights
         : none();
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
            ? some<unknown>(
                 new InterruptedException(
                    "Interrupted by fibers: " +
                       Array.from(interruptors(cause))
                          .map((_) => _.seqNumber.toString())
                          .map((_) => "#" + _)
                          .join(", ")
                 )
              )
            : none()
      ),
      O.alt(() => A.head(defects(cause))),
      O.getOrElse(() => new InterruptedException())
   );
