import { tuple } from "../../Function";
import { mapBoth_ } from "./apply-seq";
import type { IO, Task } from "./model";
import { SucceedInstruction } from "./model";

/*
 * -------------------------------------------
 * Sequential Applicative Task
 * -------------------------------------------
 */

/**
 * ```haskell
 * both_ :: Apply f => (f a, f b) -> f [a, b]
 * ```
 *
 * Tuples the arguments of two `Functors`
 *
 * Tuples the success values of two `Tasks`
 *
 * @category Apply
 * @since 1.0.0
 */
export const both_ = <R, E, A, Q, D, B>(fa: Task<R, E, A>, fb: Task<Q, D, B>): Task<Q & R, D | E, readonly [A, B]> =>
   mapBoth_(fa, fb, tuple);

/**
 * ```haskell
 * both :: Apply f => f b -> f a -> f [a, b]
 * ```
 *
 * Tuples the arguments of two `Functors`
 *
 * Tuples the success values of two `Tasks`
 *
 * @category Apply
 * @since 1.0.0
 */
export const both = <Q, D, B>(fb: Task<Q, D, B>) => <R, E, A>(fa: Task<R, E, A>): Task<Q & R, D | E, readonly [A, B]> =>
   both_(fa, fb);

/**
 * ```haskell
 * pure :: Applicative f => a -> f a
 * ```
 *
 * Lifts a pure expression info an `Task`
 *
 * @category Applicative
 * @since 1.0.0
 */
export const pure = <A>(a: A): IO<A> => new SucceedInstruction(a);
