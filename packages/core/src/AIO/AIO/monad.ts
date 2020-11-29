import { identity, pipe } from "../../Function";
import { succeed } from "./constructors";
import type { AIO } from "./model";
import { ChainInstruction } from "./model";

/*
 * -------------------------------------------
 * Monad AIO
 * -------------------------------------------
 */

/**
 * ```haskell
 * chain_ :: Monad m => (m a, (a -> m b)) -> m b
 * ```
 *
 * Composes computations in sequence, using the return value of one computation as input for the next
 *
 * Returns an AIO that models the execution of this effect, followed by
 * the passing of its value to the specified continuation function `f`,
 * followed by the effect that it returns.
 *
 * @category Monad
 * @since 1.0.0
 */
export function chain_<R, E, A, U, G, B>(
  ma: AIO<R, E, A>,
  f: (a: A) => AIO<U, G, B>
): AIO<R & U, E | G, B> {
  return new ChainInstruction(ma, f);
}

/**
 * ```haskell
 * chain :: Monad m => (a -> m b) -> m a -> m b
 * ```
 *
 * Composes computations in sequence, using the return value of one computation as input for the next
 *
 * Returns an AIO that models the execution of this effect, followed by
 * the passing of its value to the specified continuation function `f`,
 * followed by the effect that it returns.
 *
 * @category Monad
 * @since 1.0.0
 */
export function chain<A, U, G, B>(
  f: (a: A) => AIO<U, G, B>
): <R, E>(ma: AIO<R, E, A>) => AIO<R & U, G | E, B> {
  return (ma) => chain_(ma, f);
}

/**
 * ```haskell
 * flatten :: Monad m => m m a -> m a
 * ```
 *
 * Removes one level of nesting from a nested `AIO`
 *
 * @category Monad
 * @since 1.0.0
 */
export function flatten<R, E, Q, D, A>(ffa: AIO<R, E, AIO<Q, D, A>>) {
  return chain_(ffa, identity);
}

/**
 * ```haskell
 * tap_ :: Monad m => (ma, (a -> m b)) -> m a
 * ```
 *
 * Composes computations in sequence, using the return value of one computation as input for the next
 * and keeping only the result of the first
 *
 * Returns an AIO that effectfully "peeks" at the success of this effect.
 *
 * @category Monad
 * @since 1.0.0
 */
export function tap_<R, E, A, Q, D, B>(
  fa: AIO<R, E, A>,
  f: (a: A) => AIO<Q, D, B>
): AIO<Q & R, D | E, A> {
  return chain_(fa, (a) =>
    pipe(
      f(a),
      chain(() => succeed(a))
    )
  );
}

/**
 * ```haskell
 * tap :: Monad m => (a -> m b) -> m a -> m a
 * ```
 *
 * Composes computations in sequence, using the return value of one computation as input for the next
 * and keeping only the result of the first
 *
 * Returns an AIO that effectfully "peeks" at the success of this effect.
 *
 * @category Monad
 * @since 1.0.0
 */
export function tap<A, Q, D, B>(
  f: (a: A) => AIO<Q, D, B>
): <R, E>(fa: AIO<R, E, A>) => AIO<Q & R, D | E, A> {
  return (fa) => tap_(fa, f);
}
