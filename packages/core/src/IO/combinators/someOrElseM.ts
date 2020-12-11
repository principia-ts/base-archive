import { constant, flow } from "../../Function";
import type { Option } from "../../Option";
import * as O from "../../Option";
import { chain_, pure } from "../_core";
import type { IO } from "../model";

/**
 * ```haskell
 * someOrElseM_ :: IO t => (t x r e (Option a), t x1 r1 e1 b) ->
 *    t (x | x1) (r & r1) (e | e1) (a | b)
 * ```
 *
 * Extracts the optional value, or executes the effect 'orElse'.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function someOrElseM_<R, E, A, R1, E1, B>(
  ef: IO<R, E, Option<A>>,
  orElse: IO<R1, E1, B>
): IO<R & R1, E | E1, A | B> {
  return chain_(ef as IO<R, E, Option<A | B>>, flow(O.map(pure), O.getOrElse(constant(orElse))));
}

/**
 * ```haskell
 * someOrElseM :: IO t => t x1 r1 e1 b -> t x r e (Option a) ->
 *    t (x | x1) (r & r1) (e | e1) (a | b)
 * ```
 *
 * Extracts the optional value, or executes the effect 'orElse'.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function someOrElseM<R1, E1, B>(
  orElse: IO<R1, E1, B>
): <R, E, A>(ef: IO<R, E, Option<A>>) => IO<R & R1, E1 | E, B | A> {
  return (ef) => someOrElseM_(ef, orElse);
}
