import type { Option } from "../../Option";
import * as O from "../../Option";
import { fail, pure } from "../_core";
import { foldM_ } from "../fold";
import type { IO } from "../model";

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
