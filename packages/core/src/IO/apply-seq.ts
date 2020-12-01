import { map_ } from "./functor";
import type { IO } from "./model";
import { chain_ } from "./monad";

/*
 * -------------------------------------------
 * Sequential Apply IO
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
export function ap_<Q, D, A, B, R, E>(
  fab: IO<Q, D, (a: A) => B>,
  fa: IO<R, E, A>
): IO<Q & R, D | E, B> {
  return zipWith_(fab, fa, (f, a) => f(a));
}

/**
 * ```haskell
 * ap :: Apply f => f (a -> b) -> f a -> f b
 * ```
 *
 * Apply a function to an argument under a type constructor
 *
 * @category Apply
 * @since 1.0.0
 */
export function ap<R, E, A>(
  fa: IO<R, E, A>
): <Q, D, B>(fab: IO<Q, D, (a: A) => B>) => IO<Q & R, E | D, B> {
  return (fab) => ap_(fab, fa);
}

export function apFirst_<R, E, A, Q, D, B>(fa: IO<R, E, A>, fb: IO<Q, D, B>): IO<Q & R, D | E, A> {
  return zipWith_(fa, fb, (a, _) => a);
}

export function apFirst<Q, D, B>(
  fb: IO<Q, D, B>
): <R, E, A>(fa: IO<R, E, A>) => IO<Q & R, D | E, A> {
  return (fa) => apFirst_(fa, fb);
}

/**
 * ```haskell
 * _apSecond :: Apply f => (f a, f b) -> f b
 * ```
 *
 * Combine two effectful actions, keeping only the result of the second
 *
 * @category Apply
 * @since 1.0.0
 */
export function apSecond_<R, E, A, Q, D, B>(fa: IO<R, E, A>, fb: IO<Q, D, B>): IO<Q & R, D | E, B> {
  return zipWith_(fa, fb, (_, b) => b);
}

/**
 * ```haskell
 * apSecond :: Apply f => f b -> f a -> f b
 * ```
 *
 * Combine two effectful actions, keeping only the result of the second
 *
 * @category Apply
 * @since 1.0.0
 */
export function apSecond<Q, D, B>(
  fb: IO<Q, D, B>
): <R, E, A>(fa: IO<R, E, A>) => IO<Q & R, D | E, B> {
  return (fa) => apSecond_(fa, fb);
}

export const andThen_ = apSecond_;
export const andThen = apSecond;

export function zipWith_<R, E, A, Q, D, B, C>(
  fa: IO<R, E, A>,
  fb: IO<Q, D, B>,
  f: (a: A, b: B) => C
): IO<Q & R, D | E, C> {
  return chain_(fa, (ra) => map_(fb, (rb) => f(ra, rb)));
}

export function zipWith<A, Q, D, B, C>(
  fb: IO<Q, D, B>,
  f: (a: A, b: B) => C
): <R, E>(fa: IO<R, E, A>) => IO<Q & R, D | E, C> {
  return (fa) => zipWith_(fa, fb, f);
}
