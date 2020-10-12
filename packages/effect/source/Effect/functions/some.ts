import { constant, flow, pipe } from "@principia/core/Function";
import type { Option } from "@principia/core/Option";
import * as O from "@principia/core/Option";

import { chain_, fail, foldM, map, pure } from "../core";
import type { Effect } from "../Effect";

/**
 * ```haskell
 * just :: Effect t => T x r e (Maybe a) -> T x r (Maybe e) a
 * ```
 *
 * Converts an optional value into an optional error
 *
 * @category Combinators
 * @since 1.0.0
 */
export const some: <R, E, A>(ef: Effect<R, E, Option<A>>) => Effect<R, Option<E>, A> = foldM(
   (e) => fail(O.some(e)),
   O.fold(() => fail(O.none()), pure)
);

/**
 * ```haskell
 * _justOrElse :: Effect t => (t x r e (Maybe a), (() -> b)) -> t x r e (a | b)
 * ```
 *
 * Extracts the optional value, or returns the given 'orElse'.
 *
 * @category Combinators
 * @since 1.0.0
 */
export const someOrElse_ = <R, E, A, B>(ef: Effect<R, E, Option<A>>, orElse: () => B): Effect<R, E, A | B> =>
   pipe(ef, map(O.getOrElse(orElse)));

/**
 * ```haskell
 * justOrElse :: Effect t => (() -> b) -> t x r e (Maybe a) -> t x r e (a | b)
 * ```
 *
 * Extracts the optional value, or returns the given 'orElse'.
 *
 * @category Combinators
 * @since 1.0.0
 */
export const someOrElse = <B>(orElse: () => B) => <R, E, A>(ef: Effect<R, E, Option<A>>) => someOrElse_(ef, orElse);

/**
 * ```haskell
 * _justOrElseM :: Effect t => (t x r e (Maybe a), t x1 r1 e1 b) ->
 *    t (x | x1) (r & r1) (e | e1) (a | b)
 * ```
 *
 * Extracts the optional value, or executes the effect 'orElse'.
 *
 * @category Combinators
 * @since 1.0.0
 */
export const someOrElseM_ = <R, E, A, R1, E1, B>(
   ef: Effect<R, E, Option<A>>,
   orElse: Effect<R1, E1, B>
): Effect<R & R1, E | E1, A | B> =>
   chain_(ef as Effect<R, E, Option<A | B>>, flow(O.map(pure), O.getOrElse(constant(orElse))));

/**
 * ```haskell
 * _justOrElseM :: Effect t => t x1 r1 e1 b -> t x r e (Maybe a) ->
 *    t (x | x1) (r & r1) (e | e1) (a | b)
 * ```
 *
 * Extracts the optional value, or executes the effect 'orElse'.
 *
 * @category Combinators
 * @since 1.0.0
 */
export const someOrElseM = <R1, E1, B>(orElse: Effect<R1, E1, B>) => <R, E, A>(
   ef: Effect<R, E, Option<A>>
): Effect<R & R1, E | E1, A | B> => someOrElseM_(ef, orElse);
