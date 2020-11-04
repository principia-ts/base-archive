import { makeMonoid } from "@principia/prelude";

import * as A from "../../Array";
import * as E from "../../Either";
import type { FreeMonoid } from "../../FreeMonoid";
import * as FS from "../../FreeMonoid";
import * as I from "../../Iterable";
import * as O from "../../Option";
import { none, some } from "../../Option";
import * as Ex from "../Exit/_core";
import type { Cause } from "../Exit/Cause";
import * as C from "../Exit/Cause";
import type { Exit } from "../Exit/model";
import type { Executor } from "../Fiber/executor";
import type { FiberDescriptor, InterruptStatus } from "../Fiber/model";
import { mapBoth_ } from "./apply-seq";
import { first } from "./bifunctor";
import { fail, halt, succeed, suspend, total } from "./constructors";
import { foldCauseM_, foldM_ } from "./fold";
import { map_ } from "./functor";
import type { RIO, Task } from "./model";
import { CheckDescriptorInstruction, FoldInstruction, ForkInstruction, GetInterruptInstruction } from "./model";
import { chain_ } from "./monad";
import { unit } from "./unit";

/*
 * -------------------------------------------
 * Core Task Combinators
 * -------------------------------------------
 */

export const catchAll_ = <R, E, A, R1, E1, A1>(
   ma: Task<R, E, A>,
   f: (e: E) => Task<R1, E1, A1>
): Task<R & R1, E1, A | A1> => foldM_(ma, f, (x) => succeed(x));

export const catchAll = <R, E, E2, A>(f: (e: E2) => Task<R, E, A>) => <R2, A2>(ma: Task<R2, E2, A2>) =>
   catchAll_(ma, f);

export const uncause = <R, E>(ma: Task<R, never, C.Cause<E>>): Task<R, E, void> =>
   chain_(ma, (a) => (C.isEmpty(a) ? unit() : halt(a)));

/**
 * Ignores the result of the effect, replacing it with unit
 *
 * @category Combinators
 * @since 1.0.0
 */
export const asUnit = <R, E>(ma: Task<R, E, any>) => chain_(ma, () => unit());

/**
 * ```haskell
 * as_ :: (Task r e a, b) -> Task r e b
 * ```
 *
 * Maps the success value of this effect to the specified constant value.
 *
 * @category Combinators
 * @since 1.0.0
 */
export const as_ = <R, E, A, B>(ma: Task<R, E, A>, b: B) => map_(ma, () => b);

/**
 * ```haskell
 * as :: b -> Task r e a -> Task r e b
 * ```
 *
 * Maps the success value of this effect to the specified constant value.
 *
 * @category Combinators
 * @since 1.0.0
 */
export const as = <B>(b: B) => <R, E, A>(ma: Task<R, E, A>) => as_(ma, b);

/**
 * ```haskell
 * asSomeError :: Task r e a -> Task r (Maybe e) a
 * ```
 *
 * Maps the error value of this effect to an optional value.
 *
 * @category Combinators
 * @since 1.0.0
 */
export const asSomeError: <R, E, A>(ma: Task<R, E, A>) => Task<R, O.Option<E>, A> = first(some);

export const cause = <R, E, A>(effect: Task<R, E, A>): Task<R, never, Cause<E>> =>
   foldCauseM_(effect, succeed, () => succeed(C.empty));

/**
 * The moral equivalent of
 * ```typescript
 * if (b) {
 *    onTrue();
 * } else {
 *    onFalse();
 * }
 * ```
 *
 * @category Combinators
 * @since 1.0.0
 */
export const ifM_ = <R, E, R1, E1, A1, R2, E2, A2>(
   mb: Task<R, E, boolean>,
   onTrue: () => Task<R1, E1, A1>,
   onFalse: () => Task<R2, E2, A2>
): Task<R & R1 & R2, E | E1 | E2, A1 | A2> =>
   chain_(mb, (x) => (x ? (onTrue() as Task<R & R1 & R2, E | E1 | E2, A1 | A2>) : onFalse()));

/**
 * The moral equivalent of
 * ```typescript
 * if (b) {
 *    onTrue();
 * } else {
 *    onFalse();
 * }
 * ```
 *
 * @category Combinators
 * @since 1.0.0
 */
export const ifM = <R1, E1, A1, R2, E2, A2>(onTrue: () => Task<R1, E1, A1>, onFalse: () => Task<R2, E2, A2>) => <R, E>(
   b: Task<R, E, boolean>
): Task<R & R1 & R2, E | E1 | E2, A1 | A2> => ifM_(b, onTrue, onFalse);

export const if_ = <R, E, A, R1, E1, A1>(
   b: boolean,
   onTrue: () => Task<R, E, A>,
   onFalse: () => Task<R1, E1, A1>
): Task<R & R1, E | E1, A | A1> => ifM_(succeed(b), onTrue, onFalse);

const _if = <R, E, A, R1, E1, A1>(onTrue: () => Task<R, E, A>, onFalse: () => Task<R1, E1, A1>) => (
   b: boolean
): Task<R & R1, E | E1, A | A1> => if_(b, onTrue, onFalse);
export { _if as if };

/**
 * Lifts an `Either` into an `Task`
 */
export const fromEither = <E, A>(f: () => E.Either<E, A>) => chain_(total(f), E.fold(fail, succeed));

/**
 * ```haskell
 * absolve :: Task r e (Either e1 a) -> Task r (e | e1) a
 * ```
 *
 * Returns a task that submerges the error case of an `Either` into the
 * `Task`.
 *
 * @category Combinators
 * @since 1.0.0
 */
export const absolve = <R, E, E1, A>(v: Task<R, E, E.Either<E1, A>>) => chain_(v, (e) => fromEither(() => e));

/**
 * Applies the function `f` to each element of the `Iterable<A>` and runs
 * produced effects sequentially.
 *
 * Equivalent to `asUnit(foreach(f)(as))`, but without the cost of building
 * the list of results.
 *
 * @category Combinators
 * @since 1.0.0
 */
export const traverseIUnit_ = <R, E, A>(as: Iterable<A>, f: (a: A) => Task<R, E, any>): Task<R, E, void> =>
   I.foldMap(makeMonoid<Task<R, E, void>>((x, y) => chain_(x, () => y), unit()))(f)(as);

/**
 * Applies the function `f` to each element of the `Iterable<A>` and runs
 * produced effects sequentially.
 *
 * Equivalent to `asUnit(foreach(f)(as))`, but without the cost of building
 * the list of results.
 *
 * @category Combinators
 * @since 1.0.0
 */
export const traverseIUnit = <R, E, A>(f: (a: A) => Task<R, E, any>) => (as: Iterable<A>): Task<R, E, void> =>
   traverseIUnit_(as, f);

/**
 * Applies the function `f` to each element of the `Iterable<A>` and
 * returns the results in a new `readonly B[]`.
 *
 * For a parallel version of this method, see `foreachPar`.
 * If you do not need the results, see `foreachUnit` for a more efficient implementation.
 *
 * @category Combinators
 * @since 1.0.0
 */
export const traverseI_ = <R, E, A, B>(as: Iterable<A>, f: (a: A) => Task<R, E, B>): Task<R, E, ReadonlyArray<B>> =>
   map_(
      I.reduce_(as, succeed(FS.empty<B>()) as Task<R, E, FreeMonoid<B>>, (b, a) =>
         mapBoth_(
            b,
            suspend(() => f(a)),
            (acc, r) => FS.append_(acc, r)
         )
      ),
      FS.toArray
   );

/**
 * Applies the function `f` to each element of the `Iterable<A>` and
 * returns the results in a new `readonly B[]`.
 *
 * For a parallel version of this method, see `foreachPar`.
 * If you do not need the results, see `foreachUnit` for a more efficient implementation.
 *
 * @category Combinators
 * @since 1.0.0
 */
export const traverseI = <R, E, A, B>(f: (a: A) => Task<R, E, B>) => (as: Iterable<A>): Task<R, E, ReadonlyArray<B>> =>
   traverseI_(as, f);

export const result = <R, E, A>(value: Task<R, E, A>): Task<R, never, Exit<E, A>> =>
   new FoldInstruction(
      value,
      (cause) => succeed(Ex.failure(cause)),
      (succ) => succeed(Ex.succeed(succ))
   );

export const foldl_ = <A, B, R, E>(as: Iterable<A>, b: B, f: (b: B, a: A) => Task<R, E, B>): Task<R, E, B> =>
   A.reduce_(Array.from(as), succeed(b) as Task<R, E, B>, (acc, el) => chain_(acc, (a) => f(a, el)));

export const foldl = <R, E, A, B>(b: B, f: (b: B, a: A) => Task<R, E, B>) => (as: Iterable<A>) => foldl_(as, b, f);

export const foldr_ = <A, Z, R, E>(i: Iterable<A>, zero: Z, f: (a: A, z: Z) => Task<R, E, Z>): Task<R, E, Z> =>
   A.reduceRight_(Array.from(i), succeed(zero) as Task<R, E, Z>, (el, acc) => chain_(acc, (a) => f(el, a)));

export const foldr = <A, Z, R, E>(zero: Z, f: (a: A, z: Z) => Task<R, E, Z>) => (i: Iterable<A>) => foldr_(i, zero, f);

export const whenM_ = <R, E, A, R1, E1>(f: Task<R, E, A>, b: Task<R1, E1, boolean>) =>
   chain_(b, (a) => (a ? map_(f, some) : map_(unit(), () => none())));

export const whenM = <R, E>(b: Task<R, E, boolean>) => <R1, E1, A>(f: Task<R1, E1, A>) => whenM_(f, b);

export const tapCause_ = <R2, A2, R, E, E2>(effect: Task<R2, E2, A2>, f: (e: Cause<E2>) => Task<R, E, any>) =>
   foldCauseM_(effect, (c) => chain_(f(c), () => halt(c)), succeed);

export const tapCause = <R, E, E1>(f: (e: Cause<E1>) => Task<R, E, any>) => <R1, A1>(effect: Task<R1, E1, A1>) =>
   tapCause_(effect, f);

export const checkDescriptor = <R, E, A>(f: (d: FiberDescriptor) => Task<R, E, A>): Task<R, E, A> =>
   new CheckDescriptorInstruction(f);

export const checkInterruptible = <R, E, A>(f: (i: InterruptStatus) => Task<R, E, A>): Task<R, E, A> =>
   new GetInterruptInstruction(f);

export const fork = <R, E, A>(value: Task<R, E, A>): RIO<R, Executor<E, A>> => new ForkInstruction(value, O.none());
