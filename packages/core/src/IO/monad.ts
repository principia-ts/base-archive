import type * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import { identity, pipe } from "../Function";
import { succeed } from "./constructors";
import type { IO, URI, V } from "./model";
import { ChainInstruction } from "./model";
import { unit } from "./unit";

/*
 * -------------------------------------------
 * Monad IO
 * -------------------------------------------
 */

/**
 * ```haskell
 * chain_ :: Monad m => (m a, (a -> m b)) -> m b
 * ```
 *
 * Composes computations in sequence, using the return value of one computation as input for the next
 *
 * Returns an IO that models the execution of this effect, followed by
 * the passing of its value to the specified continuation function `f`,
 * followed by the effect that it returns.
 *
 * @category Monad
 * @since 1.0.0
 */
export function chain_<R, E, A, U, G, B>(
  ma: IO<R, E, A>,
  f: (a: A) => IO<U, G, B>
): IO<R & U, E | G, B> {
  return new ChainInstruction(ma, f);
}

/**
 * ```haskell
 * chain :: Monad m => (a -> m b) -> m a -> m b
 * ```
 *
 * Composes computations in sequence, using the return value of one computation as input for the next
 *
 * Returns an IO that models the execution of this effect, followed by
 * the passing of its value to the specified continuation function `f`,
 * followed by the effect that it returns.
 *
 * @category Monad
 * @since 1.0.0
 * @dataFirst chain_
 */
export function chain<A, U, G, B>(
  f: (a: A) => IO<U, G, B>
): <R, E>(ma: IO<R, E, A>) => IO<R & U, G | E, B> {
  return (ma) => chain_(ma, f);
}

/**
 * ```haskell
 * flatten :: Monad m => m m a -> m a
 * ```
 *
 * Removes one level of nesting from a nested `IO`
 *
 * @category Monad
 * @since 1.0.0
 */
export function flatten<R, E, Q, D, A>(ffa: IO<R, E, IO<Q, D, A>>) {
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
 * Returns an IO that effectfully "peeks" at the success of this effect.
 *
 * @category Monad
 * @since 1.0.0
 */
export function tap_<R, E, A, Q, D, B>(
  fa: IO<R, E, A>,
  f: (a: A) => IO<Q, D, B>
): IO<Q & R, D | E, A> {
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
 * Returns an IO that effectfully "peeks" at the success of this effect.
 *
 * @category Monad
 * @since 1.0.0
 * @dataFirst tap_
 */
export function tap<A, Q, D, B>(
  f: (a: A) => IO<Q, D, B>
): <R, E>(fa: IO<R, E, A>) => IO<Q & R, D | E, A> {
  return (fa) => tap_(fa, f);
}

export const Monad: P.Monad<[URI], V> = HKT.instance({
  map_: <R, E, A, B>(fa: IO<R, E, A>, f: (a: A) => B) => chain_(fa, (a) => succeed<E, B>(f(a))),
  map: <A, B>(f: (a: A) => B) => <R, E>(fa: IO<R, E, A>) => chain_(fa, (a) => succeed<E, B>(f(a))),
  flatten,
  unit
});
