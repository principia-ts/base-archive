import { tuple } from "../Function";
import { zipWith_ } from "./apply-seq";
import type { IO, UIO } from "./model";
import { SucceedInstruction } from "./model";

/*
 * -------------------------------------------
 * Sequential Applicative IO
 * -------------------------------------------
 */

/**
 * ```haskell
 * zip_ :: Apply f => (f a, f b) -> f [a, b]
 * ```
 *
 * Tuples the arguments of two `Functors`
 *
 * Tuples the success values of two `IOs`
 *
 * @category Apply
 * @since 1.0.0
 */
export function zip_<R, E, A, Q, D, B>(
  fa: IO<R, E, A>,
  fb: IO<Q, D, B>
): IO<Q & R, D | E, readonly [A, B]> {
  return zipWith_(fa, fb, tuple);
}

/**
 * ```haskell
 * zip :: Apply f => f b -> f a -> f [a, b]
 * ```
 *
 * Tuples the arguments of two `Functors`
 *
 * Tuples the success values of two `IOs`
 *
 * @category Apply
 * @since 1.0.0
 */
export function zip<Q, D, B>(
  fb: IO<Q, D, B>
): <R, E, A>(fa: IO<R, E, A>) => IO<Q & R, D | E, readonly [A, B]> {
  return (fa) => zip_(fa, fb);
}

/**
 * ```haskell
 * pure :: Applicative f => a -> f a
 * ```
 *
 * Lifts a pure expression info an `IO`
 *
 * @category Applicative
 * @since 1.0.0
 */
export function pure<A>(a: A): UIO<A> {
  return new SucceedInstruction(a);
}
