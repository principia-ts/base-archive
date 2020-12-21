import type { IO } from "../core";
import type { Option } from "@principia/base/data/Option";

import { pipe } from "@principia/base/data/Function";
import * as O from "@principia/base/data/Option";

import { map } from "../core";

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
