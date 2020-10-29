import { map_ } from "./functor";
import type { Task } from "./model";
import { chain_ } from "./monad";

/*
 * -------------------------------------------
 * Sequential Apply Task
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
export const ap_ = <Q, D, A, B, R, E>(fab: Task<Q, D, (a: A) => B>, fa: Task<R, E, A>): Task<Q & R, D | E, B> =>
   chain_(fab, (ab) => map_(fa, ab));

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
export const ap = <R, E, A>(fa: Task<R, E, A>) => <Q, D, B>(fab: Task<Q, D, (a: A) => B>): Task<Q & R, D | E, B> =>
   ap_(fab, fa);

export const apFirst_ = <R, E, A, Q, D, B>(fa: Task<R, E, A>, fb: Task<Q, D, B>): Task<Q & R, D | E, A> =>
   ap_(
      map_(fa, (a) => () => a),
      fb
   );

export const apFirst = <Q, D, B>(fb: Task<Q, D, B>) => <R, E, A>(fa: Task<R, E, A>): Task<Q & R, D | E, A> =>
   apFirst_(fa, fb);

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
export const _apSecond = <R, E, A, Q, D, B>(fa: Task<R, E, A>, fb: Task<Q, D, B>): Task<Q & R, D | E, B> =>
   ap_(
      map_(fa, () => (b: B) => b),
      fb
   );

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
export const apSecond = <Q, D, B>(fb: Task<Q, D, B>) => <R, E, A>(fa: Task<R, E, A>): Task<Q & R, D | E, B> =>
   _apSecond(fa, fb);

export const mapBoth_ = <R, E, A, Q, D, B, C>(
   fa: Task<R, E, A>,
   fb: Task<Q, D, B>,
   f: (a: A, b: B) => C
): Task<Q & R, D | E, C> => chain_(fa, (ra) => map_(fb, (rb) => f(ra, rb)));

export const mapBoth = <A, Q, D, B, C>(fb: Task<Q, D, B>, f: (a: A, b: B) => C) => <R, E>(
   fa: Task<R, E, A>
): Task<Q & R, D | E, C> => mapBoth_(fa, fb, f);
