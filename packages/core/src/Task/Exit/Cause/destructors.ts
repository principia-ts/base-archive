import { matchTag } from "@principia/prelude/Utils";

import * as F from "../../../Function";
import * as O from "../../../Option";
import * as Sy from "../../../Sync";
import type { FiberId } from "../../Fiber/FiberId";
import type { Cause } from "./model";

/*
 * -------------------------------------------
 * Cause Destructors
 * -------------------------------------------
 */

/**
 * @internal
 */
export const findSafe_ = <E, A>(
   cause: Cause<E>,
   f: (cause: Cause<E>) => O.Option<A>
): Sy.Sync<unknown, never, O.Option<A>> =>
   Sy.gen(function* (_) {
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
export const find = <A, E>(f: (cause: Cause<E>) => O.Option<A>) => (cause: Cause<E>): O.Option<A> =>
   Sy.runIO(findSafe_(cause, f));

/**
 * @internal
 */
export const foldSafe_ = <E, A>(
   cause: Cause<E>,
   onEmpty: () => A,
   onFail: (reason: E) => A,
   onDie: (reason: unknown) => A,
   onInterrupt: (id: FiberId) => A,
   onThen: (l: A, r: A) => A,
   onBoth: (l: A, r: A) => A
): Sy.IO<A> =>
   Sy.gen(function* (_) {
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
               yield* _(foldSafe_(cause.left, onEmpty, onFail, onDie, onInterrupt, onThen, onBoth)),
               yield* _(foldSafe_(cause.right, onEmpty, onFail, onDie, onInterrupt, onThen, onBoth))
            );
         case "Then":
            return onThen(
               yield* _(foldSafe_(cause.left, onEmpty, onFail, onDie, onInterrupt, onThen, onBoth)),
               yield* _(foldSafe_(cause.right, onEmpty, onFail, onDie, onInterrupt, onThen, onBoth))
            );
      }
   });

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
) => (cause: Cause<E>): A => Sy.runIO(foldSafe_(cause, onEmpty, onFail, onDie, onInterrupt, onThen, onBoth));

/**
 * @internal
 */
export const foldlSafe_ = <E, B>(cause: Cause<E>, b: B, f: (b: B, cause: Cause<E>) => O.Option<B>): Sy.IO<B> =>
   Sy.gen(function* (_) {
      const apply = O.getOrElse_(f(b, cause), () => b);
      switch (cause._tag) {
         case "Then": {
            const l = yield* _(foldlSafe_(cause.left, apply, f));
            const r = yield* _(foldlSafe_(cause.right, l, f));
            return r;
         }
         case "Both": {
            const l = yield* _(foldlSafe_(cause.left, apply, f));
            const r = yield* _(foldlSafe_(cause.right, l, f));
            return r;
         }
         default: {
            return apply;
         }
      }
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
export const foldl_ = F.trampoline(function loop<E, A>(
   cause: Cause<E>,
   a: A,
   f: (a: A, cause: Cause<E>) => O.Option<A>
): F.Trampoline<A> {
   const apply = O.getOrElse_(f(a, cause), () => a);
   return cause._tag === "Both" || cause._tag === "Then"
      ? F.more(() => loop(cause.right, foldl_(cause.left, apply, f), f))
      : F.done(apply);
});

/*
 * export const foldl_ = <E, B>(cause: Cause<E>, b: B, f: (b: B, cause: Cause<E>) => O.Option<B>): B =>
 *    Sy.runIO(foldlSafe_(cause, b, f));
 */

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

/**
 * ```haskell
 * interruptOption :: Cause e -> Option FiberId
 * ```
 *
 * Returns the `FiberID` associated with the first `Interrupt` in this `Cause` if one
 * exists.
 */
export const interruptOption: <E>(cause: Cause<E>) => O.Option<FiberId> = find((c) =>
   c._tag === "Interrupt" ? O.some(c.fiberId) : O.none()
);

/**
 * ```haskell
 * failureOption :: Cause e -> Option e
 * ```
 *
 * Returns the `E` associated with the first `Fail` in this `Cause` if one
 * exists.
 */
export const failureOption: <E>(cause: Cause<E>) => O.Option<E> = find((c) =>
   c._tag === "Fail" ? O.some(c.value) : O.none()
);

/**
 * ```haskell
 * dieOption :: Cause e -> Option _
 * ```
 *
 * Returns the `Error` associated with the first `Die` in this `Cause` if
 * one exists.
 */
export const dieOption: <E>(cause: Cause<E>) => O.Option<unknown> = find((c) =>
   c._tag === "Die" ? O.some(c.value) : O.none()
);
