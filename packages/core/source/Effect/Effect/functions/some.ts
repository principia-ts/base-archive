import { NoSuchElementException } from "packages/core/source/GlobalExceptions";

import { constant, flow, pipe } from "../../../Function";
import type { Option } from "../../../Option";
import * as O from "../../../Option";
import { chain_, fail, foldM, map, pure, total } from "../core";
import type { Effect } from "../model";

/**
 * ```haskell
 * some :: Effect t => T x r e (Maybe a) -> T x r (Maybe e) a
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
 * someOrElse_ :: Effect t => (t x r e (Maybe a), (() -> b)) -> t x r e (a | b)
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
 * someOrElse :: Effect t => (() -> b) -> t x r e (Maybe a) -> t x r e (a | b)
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
 * someOrElseM_ :: Effect t => (t x r e (Maybe a), t x1 r1 e1 b) ->
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
 * someOrElseM :: Effect t => t x1 r1 e1 b -> t x r e (Maybe a) ->
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

/**
 * Extracts the optional value, or fails with the given error 'e'.
 */
export const someOrFail_ = <R, E, A, E1>(ma: Effect<R, E, Option<A>>, orFail: () => E1): Effect<R, E | E1, A> =>
   chain_(
      ma,
      O.fold(() => chain_(total(orFail), fail), pure)
   );

export const someOrFail = <E1>(orFail: () => E1) => <R, E, A>(ma: Effect<R, E, Option<A>>): Effect<R, E | E1, A> =>
   someOrFail_(ma, orFail);

export const someOrFailException = <R, E, A>(ma: Effect<R, E, Option<A>>): Effect<R, E | NoSuchElementException, A> =>
   someOrFail_(ma, () => new NoSuchElementException("Effect.someOrFailException"));
