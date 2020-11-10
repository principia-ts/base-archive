import { chain_, fail, foldM, map, pure, total } from "../_core";
import { constant, flow, pipe } from "../../../Function";
import { NoSuchElementException } from "../../../GlobalExceptions";
import type { Option } from "../../../Option";
import * as O from "../../../Option";
import type { Task } from "../model";

/**
 * ```haskell
 * some :: Task t => T x r e (Option a) -> T x r (Option e) a
 * ```
 *
 * Converts an optional value into an optional error
 *
 * @category Combinators
 * @since 1.0.0
 */
export const some: <R, E, A>(ef: Task<R, E, Option<A>>) => Task<R, Option<E>, A> = foldM(
   (e) => fail(O.some(e)),
   O.fold(() => fail(O.none()), pure)
);

/**
 * ```haskell
 * someOrElse_ :: Task t => (t x r e (Option a), (() -> b)) -> t x r e (a | b)
 * ```
 *
 * Extracts the optional value, or returns the given 'orElse'.
 *
 * @category Combinators
 * @since 1.0.0
 */
export const someOrElse_ = <R, E, A, B>(ef: Task<R, E, Option<A>>, orElse: () => B): Task<R, E, A | B> =>
   pipe(ef, map(O.getOrElse(orElse)));

/**
 * ```haskell
 * someOrElse :: Task t => (() -> b) -> t x r e (Option a) -> t x r e (a | b)
 * ```
 *
 * Extracts the optional value, or returns the given 'orElse'.
 *
 * @category Combinators
 * @since 1.0.0
 */
export const someOrElse = <B>(orElse: () => B) => <R, E, A>(ef: Task<R, E, Option<A>>) => someOrElse_(ef, orElse);

/**
 * ```haskell
 * someOrElseM_ :: Task t => (t x r e (Option a), t x1 r1 e1 b) ->
 *    t (x | x1) (r & r1) (e | e1) (a | b)
 * ```
 *
 * Extracts the optional value, or executes the effect 'orElse'.
 *
 * @category Combinators
 * @since 1.0.0
 */
export const someOrElseM_ = <R, E, A, R1, E1, B>(
   ef: Task<R, E, Option<A>>,
   orElse: Task<R1, E1, B>
): Task<R & R1, E | E1, A | B> =>
   chain_(ef as Task<R, E, Option<A | B>>, flow(O.map(pure), O.getOrElse(constant(orElse))));

/**
 * ```haskell
 * someOrElseM :: Task t => t x1 r1 e1 b -> t x r e (Option a) ->
 *    t (x | x1) (r & r1) (e | e1) (a | b)
 * ```
 *
 * Extracts the optional value, or executes the effect 'orElse'.
 *
 * @category Combinators
 * @since 1.0.0
 */
export const someOrElseM = <R1, E1, B>(orElse: Task<R1, E1, B>) => <R, E, A>(
   ef: Task<R, E, Option<A>>
): Task<R & R1, E | E1, A | B> => someOrElseM_(ef, orElse);

/**
 * Extracts the optional value, or fails with the given error 'e'.
 */
export const someOrFail_ = <R, E, A, E1>(ma: Task<R, E, Option<A>>, orFail: () => E1): Task<R, E | E1, A> =>
   chain_(
      ma,
      O.fold(() => chain_(total(orFail), fail), pure)
   );

export const someOrFail = <E1>(orFail: () => E1) => <R, E, A>(ma: Task<R, E, Option<A>>): Task<R, E | E1, A> =>
   someOrFail_(ma, orFail);

export const someOrFailException = <R, E, A>(ma: Task<R, E, Option<A>>): Task<R, E | NoSuchElementException, A> =>
   someOrFail_(ma, () => new NoSuchElementException("Task.someOrFailException"));