import type { IO } from "../core";
import type { Option } from "@principia/base/data/Option";

import * as O from "@principia/base/data/Option";

import { fail, foldM_, pure } from "../core";

/**
 * ```haskell
 * some :: IO t => T x r e (Option a) -> T x r (Option e) a
 * ```
 *
 * Converts an optional value into an optional error
 *
 * @category Combinators
 * @since 1.0.0
 */
export function some<R, E, A>(ef: IO<R, E, Option<A>>): IO<R, Option<E>, A> {
  return foldM_(
    ef,
    (e) => fail(O.some(e)),
    O.fold(() => fail(O.none()), pure)
  );
}
