import { pipe } from "../../Function";
import type { Option } from "../../Option";
import * as O from "../../Option";
import { map } from "../_core";
import type { IO } from "../model";

/**
 * ```haskell
 * someOrElse_ :: IO t => (t x r e (Option a), (() -> b)) -> t x r e (a | b)
 * ```
 *
 * Extracts the optional value, or returns the given 'orElse'.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function someOrElse_<R, E, A, B>(ef: IO<R, E, Option<A>>, orElse: () => B): IO<R, E, A | B> {
  return pipe(ef, map(O.getOrElse(orElse)));
}

/**
 * ```haskell
 * someOrElse :: IO t => (() -> b) -> t x r e (Option a) -> t x r e (a | b)
 * ```
 *
 * Extracts the optional value, or returns the given 'orElse'.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function someOrElse<B>(
  orElse: () => B
): <R, E, A>(ef: IO<R, E, Option<A>>) => IO<R, E, B | A> {
  return (ef) => someOrElse_(ef, orElse);
}
