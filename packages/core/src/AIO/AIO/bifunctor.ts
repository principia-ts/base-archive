import { flow } from "../../Function";
import * as C from "../Exit/Cause";
import { fail, halt, succeed } from "./constructors";
import { foldCauseM_, foldM_ } from "./fold";
import type { AIO } from "./model";

/*
 * -------------------------------------------
 * Bifunctor AIO
 * -------------------------------------------
 */

/**
 * Returns an AIO whose failure and success channels have been mapped by
 * the specified pair of functions, `f` and `g`.
 *
 * @category Bifunctor
 * @since 1.0.0
 */
export function bimap_<R, E, A, G, B>(
  pab: AIO<R, E, A>,
  f: (e: E) => G,
  g: (a: A) => B
): AIO<R, G, B> {
  return foldM_(
    pab,
    (e) => fail(f(e)),
    (a) => succeed(g(a))
  );
}

/**
 * Returns an AIO whose failure and success channels have been mapped by
 * the specified pair of functions, `f` and `g`.
 *
 * @category Bifunctor
 * @since 1.0.0
 */
export function bimap<E, G, A, B>(
  f: (e: E) => G,
  g: (a: A) => B
): <R>(pab: AIO<R, E, A>) => AIO<R, G, B> {
  return (pab) => bimap_(pab, f, g);
}

/**
 * ```haskell
 * mapError_ :: Bifunctor p => (p a c, (a -> b)) -> p b c
 * ```
 *
 * Map covariantly over the first argument.
 *
 * Returns an AIO with its error channel mapped using the specified
 * function. This can be used to lift a "smaller" error into a "larger"
 * error.
 *
 * @category Bifunctor
 * @since 1.0.0
 */
export function mapError_<R, E, A, D>(fea: AIO<R, E, A>, f: (e: E) => D): AIO<R, D, A> {
  return foldCauseM_(fea, flow(C.map(f), halt), succeed);
}

/**
 * ```haskell
 * mapError :: Bifunctor p => (a -> b) -> p a c -> p b c
 * ```
 *
 * Map covariantly over the first argument.
 *
 * Returns an AIO with its error channel mapped using the specified
 * function. This can be used to lift a "smaller" error into a "larger"
 * error.
 *
 * @category Bifunctor
 * @since 1.0.0
 */
export function mapError<E, D>(f: (e: E) => D): <R, A>(fea: AIO<R, E, A>) => AIO<R, D, A> {
  return (fea) => mapError_(fea, f);
}
