import * as A from "@principia/core/Array";
import type { Either } from "@principia/core/Either";
import * as E from "@principia/core/Either";
import { flow, identity, pipe } from "@principia/core/Function";
import * as Mb from "@principia/core/Maybe";
import { just, Maybe, nothing } from "@principia/core/Maybe";
import type * as TC from "@principia/core/typeclass-index";
import { matchTag } from "@principia/core/Utils";

import type { FiberId } from "../Fiber/FiberId";
import { Both, Cause, Then, URI, V } from "./Cause";
import { InterruptedException } from "./errors";
import { equalsCause } from "./instances";

export const empty: Cause<never> = {
   _tag: "Empty"
};

/**
 * ```haskell
 * find :: (Cause c, Maybe m) => (c e -> m a) -> c e -> m a
 * ```
 *
 * Finds the first result matching f
 *
 * @category Combinators
 * @since 1.0.0
 */
export const find = <A, E>(f: (cause: Cause<E>) => Maybe<A>) => (cause: Cause<E>): Maybe<A> => {
   const apply = f(cause);

   if (apply._tag === "Just") {
      return apply;
   }

   switch (cause._tag) {
      case "Then": {
         const isLeft = find(f)(cause.left);
         if (isLeft._tag === "Just") {
            return isLeft;
         } else {
            return find(f)(cause.right);
         }
      }
      case "Both": {
         const isLeft = find(f)(cause.left);
         if (isLeft._tag === "Just") {
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
 * _foldl :: (Cause c) => (c e, a, ((a, c e) -> Maybe a)) -> a
 * ```
 *
 * Accumulates a state over a Cause
 *
 * @category Destructors
 * @since 1.0.0
 */
export const _foldl = <E, A>(
   cause: Cause<E>,
   a: A,
   f: (a: A, cause: Cause<E>) => Mb.Maybe<A>
): A => {
   const apply = Mb._getOrElse(f(a, cause), () => a);
   return cause._tag === "Both" || cause._tag === "Then"
      ? _foldl(cause.right, _foldl(cause.left, apply, f), f)
      : apply;
};

/**
 * ```haskell
 * foldl :: (Cause c) => (a, ((a, c e) -> Maybe a)) -> c e -> a
 * ```
 *
 * Accumulates a state over a Cause
 *
 * @category Destructors
 * @since 1.0.0
 */
export const foldl = <E, A>(a: A, f: (a: A, cause: Cause<E>) => Mb.Maybe<A>) => (
   cause: Cause<E>
): A => _foldl(cause, a, f);

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
   _foldl(cause, true as boolean, (acc, c) =>
      pipe(
         c,
         matchTag({
            Empty: () => just(acc),
            Die: () => just(false),
            Fail: () => just(false),
            Interrupt: () => just(false),
            Then: () => nothing(),
            Both: () => nothing()
         })
      )
   );

/**
 * ```haskell
 * dieMaybe :: Cause e -> Maybe _
 * ```
 *
 * Returns the `Error` associated with the first `Die` in this `Cause` if
 * one exists.
 */
export const dieMaybe: <E>(cause: Cause<E>) => Maybe<unknown> = find((c) =>
   c._tag === "Die" ? just(c.value) : nothing()
);

/**
 * ```haskell
 * isDie :: Cause e -> Boolean
 * ```
 *
 * Returns if a cause contains a defect
 */
export const isDie: <E>(cause: Cause<E>) => boolean = flow(
   dieMaybe,
   Mb.map(() => true),
   Mb.getOrElse(() => false)
);

/**
 * ```haskell
 * failureMaybe :: Cause e -> Maybe e
 * ```
 *
 * Returns the `E` associated with the first `Fail` in this `Cause` if one
 * exists.
 */
export const failureMaybe: <E>(cause: Cause<E>) => Maybe<E> = find((c) =>
   c._tag === "Fail" ? just(c.value) : nothing()
);

/**
 * ```haskell
 * didFail :: Cause e -> Boolean
 * ```
 *
 * Returns if the cause has a failure in it
 */
export const didFail: <E>(cause: Cause<E>) => boolean = flow(
   failureMaybe,
   Mb.map(() => true),
   Mb.getOrElse(() => false)
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
 * interruptMaybe :: Cause e -> Maybe FiberId
 * ```
 *
 * Returns the `FiberID` associated with the first `Interrupt` in this `Cause` if one
 * exists.
 */
export const interruptMaybe: <E>(cause: Cause<E>) => Maybe<FiberId> = find((c) =>
   c._tag === "Interrupt" ? just(c.fiberId) : nothing()
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
      interruptMaybe,
      Mb.map(() => true),
      Mb.getOrElse(() => false)
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
   _foldl(cause, false as boolean, (_, c) => (equalsCause(that, c) ? just(true) : nothing()));

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
export const pure: TC.PureF<[URI], V> = (a) => fail(a);

/**
 * ```haskell
 * _chain :: Monad m => (m a, (a -> m b)) -> m b
 * ```
 *
 * Composes computations in sequence, using the return value of one computation as input for the next
 *
 * @category Monad
 * @since 1.0.0
 */
export const _chain: TC.UC_ChainF<[URI], V> = (fa, f) => {
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
         return then(_chain(fa.left, f), _chain(fa.right, f));
      case "Both":
         return both(_chain(fa.left, f), _chain(fa.right, f));
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
export const chain: TC.ChainF<[URI], V> = (f) => (fa) => _chain(fa, f);

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
export const bind: TC.BindF<[URI], V> = (fa) => (f) => _chain(fa, f);

/**
 * ```haskell
 * _map :: Functor f => (f a, (a -> b)) -> f b
 * ```
 *
 * Lifts a function a -> b to a function f a -> f b
 *
 * @category Functor
 * @since 1.0.0
 */
export const _map: TC.UC_MapF<[URI], V> = (fa, f) => _chain(fa, (e) => fail(f(e)));

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
export const map: TC.MapF<[URI], V> = (f) => (fa) => _map(fa, f);

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
 * _alt :: Alt f => (f a, (() -> f a)) -> f a
 * ```
 *
 * @category Alt
 * @since 1.0.0
 */
export const _alt: TC.UC_AltF<[URI], V> = (fa, that) => _chain(fa, () => that());

/**
 * ```haskell
 * alt :: Alt f => (() -> f a) -> fa -> f a
 * ```
 *
 * @category Alt
 * @since 1.0.0
 */
export const alt: TC.AltF<[URI], V> = (that) => (fa) => _alt(fa, that);

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
export const flatten: TC.FlattenF<[URI], V> = (ffa) => _chain(ffa, identity);

/**
 * ```haskell
 * _ap :: Apply f => (f (a -> b), f a) -> f b
 * ```
 *
 * Apply a function to an argument under a type constructor
 *
 * @category Apply
 * @since 1.0.0
 */
export const _ap: TC.UC_ApF<[URI], V> = (fab, fa) => _chain(fab, (f) => _map(fa, f));

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
export const ap: TC.ApF<[URI], V> = (fa) => (fab) => _ap(fab, fa);

/*
 * -------------------------------------------
 * Combinators
 * -------------------------------------------
 */

/**
 * Extracts a list of non-recoverable errors from the `Cause`.
 */
export const defects = <E>(cause: Cause<E>): ReadonlyArray<unknown> =>
   _foldl(cause, [] as ReadonlyArray<unknown>, (a, c) =>
      c._tag === "Die" ? just([...a, c.value]) : nothing()
   );

/**
 * Returns a set of interruptors, fibers that interrupted the fiber described
 * by this `Cause`.
 */
export const interruptors = <E>(cause: Cause<E>): ReadonlySet<FiberId> =>
   _foldl(cause, new Set(), (s, c) =>
      c._tag === "Interrupt" ? Mb.just(s.add(c.fiberId)) : Mb.nothing()
   );

/**
 * Determines if the `Cause` contains only interruptions and not any `Die` or
 * `Fail` causes.
 */
export const interruptedOnly = <E>(cause: Cause<E>) =>
   pipe(
      cause,
      find((c) => (isDie(c) || didFail(c) ? just(false) : nothing())),
      Mb.getOrElse(() => true)
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
export const keepDefects: <E>(cause: Cause<E>) => Maybe<Cause<never>> = matchTag({
   Empty: () => nothing(),
   Fail: () => nothing(),
   Interrupt: () => nothing(),
   Die: (c) => just(c),
   Then: (c) => {
      const lefts = keepDefects(c.left);
      const rights = keepDefects(c.right);
      return lefts._tag === "Just"
         ? rights._tag === "Just"
            ? just(then(lefts.value, rights.value))
            : lefts
         : rights._tag === "Just"
         ? rights
         : nothing();
   },
   Both: (c) => {
      const lefts = keepDefects(c.left);
      const rights = keepDefects(c.right);
      return lefts._tag === "Just"
         ? rights._tag === "Just"
            ? just(both(lefts.value, rights.value))
            : lefts
         : rights._tag === "Just"
         ? rights
         : nothing();
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
export const sequenceCauseMaybe: <E>(c: Cause<Maybe<E>>) => Maybe<Cause<E>> = matchTag({
   Empty: () => just(empty),
   Interrupt: (c) => just(c),
   Fail: (c) => Mb._map(c.value, fail),
   Die: (c) => just(c),
   Then: (c) => {
      const lefts = sequenceCauseMaybe(c.left);
      const rights = sequenceCauseMaybe(c.right);
      return lefts._tag === "Just"
         ? rights._tag === "Just"
            ? just(then(lefts.value, rights.value))
            : lefts
         : rights._tag === "Just"
         ? rights
         : nothing();
   },
   Both: (c) => {
      const lefts = sequenceCauseMaybe(c.left);
      const rights = sequenceCauseMaybe(c.right);
      return lefts._tag === "Just"
         ? rights._tag === "Just"
            ? just(both(lefts.value, rights.value))
            : lefts
         : rights._tag === "Just"
         ? rights
         : nothing();
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
      failureMaybe,
      Mb.map(E.left),
      Mb.getOrElse(() => E.right(cause as Cause<never>)) // no E inside this cause, can safely cast
   );

/**
 * Squashes a `Cause` down to a single `Throwable`, chosen to be the
 * "most important" `Throwable`.
 */
export const squash = <E>(f: (e: E) => unknown) => (cause: Cause<E>): unknown =>
   pipe(
      cause,
      failureMaybe,
      Mb.map(f),
      Mb.alt(() =>
         isInterrupt(cause)
            ? just<unknown>(
                 new InterruptedException(
                    "Interrupted by fibers: " +
                       Array.from(interruptors(cause))
                          .map((_) => _.seqNumber.toString())
                          .map((_) => "#" + _)
                          .join(", ")
                 )
              )
            : nothing()
      ),
      Mb.alt(() => A.head(defects(cause))),
      Mb.getOrElse(() => new InterruptedException())
   );
