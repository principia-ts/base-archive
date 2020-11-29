import { constant, flow, pipe } from "../../../Function";
import { NoSuchElementException } from "../../../GlobalExceptions";
import type { Option } from "../../../Option";
import * as O from "../../../Option";
import { chain_, fail, map, pure, total } from "../_core";
import { foldM_ } from "../fold";
import type { AIO } from "../model";

/**
 * ```haskell
 * some :: AIO t => T x r e (Option a) -> T x r (Option e) a
 * ```
 *
 * Converts an optional value into an optional error
 *
 * @category Combinators
 * @since 1.0.0
 */
export function some<R, E, A>(ef: AIO<R, E, Option<A>>): AIO<R, Option<E>, A> {
  return foldM_(
    ef,
    (e) => fail(O.some(e)),
    O.fold(() => fail(O.none()), pure)
  );
}

/**
 * ```haskell
 * someOrElse_ :: AIO t => (t x r e (Option a), (() -> b)) -> t x r e (a | b)
 * ```
 *
 * Extracts the optional value, or returns the given 'orElse'.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function someOrElse_<R, E, A, B>(
  ef: AIO<R, E, Option<A>>,
  orElse: () => B
): AIO<R, E, A | B> {
  return pipe(ef, map(O.getOrElse(orElse)));
}

/**
 * ```haskell
 * someOrElse :: AIO t => (() -> b) -> t x r e (Option a) -> t x r e (a | b)
 * ```
 *
 * Extracts the optional value, or returns the given 'orElse'.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function someOrElse<B>(
  orElse: () => B
): <R, E, A>(ef: AIO<R, E, Option<A>>) => AIO<R, E, B | A> {
  return (ef) => someOrElse_(ef, orElse);
}

/**
 * ```haskell
 * someOrElseM_ :: AIO t => (t x r e (Option a), t x1 r1 e1 b) ->
 *    t (x | x1) (r & r1) (e | e1) (a | b)
 * ```
 *
 * Extracts the optional value, or executes the effect 'orElse'.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function someOrElseM_<R, E, A, R1, E1, B>(
  ef: AIO<R, E, Option<A>>,
  orElse: AIO<R1, E1, B>
): AIO<R & R1, E | E1, A | B> {
  return chain_(ef as AIO<R, E, Option<A | B>>, flow(O.map(pure), O.getOrElse(constant(orElse))));
}

/**
 * ```haskell
 * someOrElseM :: AIO t => t x1 r1 e1 b -> t x r e (Option a) ->
 *    t (x | x1) (r & r1) (e | e1) (a | b)
 * ```
 *
 * Extracts the optional value, or executes the effect 'orElse'.
 *
 * @category Combinators
 * @since 1.0.0
 */
export function someOrElseM<R1, E1, B>(
  orElse: AIO<R1, E1, B>
): <R, E, A>(ef: AIO<R, E, Option<A>>) => AIO<R & R1, E1 | E, B | A> {
  return (ef) => someOrElseM_(ef, orElse);
}

/**
 * Extracts the optional value, or fails with the given error 'e'.
 */
export function someOrFail_<R, E, A, E1>(
  ma: AIO<R, E, Option<A>>,
  orFail: () => E1
): AIO<R, E | E1, A> {
  return chain_(
    ma,
    O.fold(() => chain_(total(orFail), fail), pure)
  );
}

export function someOrFail<E1>(
  orFail: () => E1
): <R, E, A>(ma: AIO<R, E, Option<A>>) => AIO<R, E1 | E, A> {
  return (ma) => someOrFail_(ma, orFail);
}

export function someOrFailException<R, E, A>(
  ma: AIO<R, E, Option<A>>
): AIO<R, E | NoSuchElementException, A> {
  return someOrFail_(ma, () => new NoSuchElementException("AIO.someOrFailException"));
}
