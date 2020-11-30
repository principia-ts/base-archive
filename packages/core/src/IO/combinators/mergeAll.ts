import { pipe } from "../../Function";
import * as XR from "../../IORef";
import * as I from "../../Iterable";
import { chain, chain_, pure, zipWith_ } from "../_core";
import { zipWithPar_ } from "../apply-par";
import type { IO } from "../model";
import { foreachUnitParN_ } from "./foreachUnitParN";

/**
 * Merges an `Iterable<IO>` to a single IO, working sequentially.
 */
export const mergeAll_ = <R, E, A, B>(
  fas: Iterable<IO<R, E, A>>,
  b: B,
  f: (b: B, a: A) => B
): IO<R, E, B> => I.reduce_(fas, pure(b) as IO<R, E, B>, (_b, a) => zipWith_(_b, a, f));

/**
 * Merges an `Iterable<IO>` to a single IO, working sequentially.
 */
export const mergeAll = <A, B>(b: B, f: (b: B, a: A) => B) => <R, E>(
  fas: Iterable<IO<R, E, A>>
): IO<R, E, B> => mergeAll_(fas, b, f);

/**
 * Merges an `Iterable<IO>` to a single IO, working in parallel.
 *
 * Due to the parallel nature of this combinator, `f` must be both:
 * - commutative: `f(a, b) == f(b, a)`
 * - associative: `f(a, f(b, c)) == f(f(a, b), c)`
 *
 * It's unsafe to execute side effects inside `f`, as `f` may be executed
 * more than once for some of `in` elements during effect execution.
 */
export const mergeAllPar_ = <R, E, A, B>(
  fas: Iterable<IO<R, E, A>>,
  b: B,
  f: (b: B, a: A) => B
): IO<R, E, B> => I.reduce_(fas, pure(b) as IO<R, E, B>, (b, a) => zipWithPar_(b, a, f));

/**
 * Merges an `Iterable<IO>` to a single IO, working in parallel.
 *
 * Due to the parallel nature of this combinator, `f` must be both:
 * - commutative: `f(a, b) == f(b, a)`
 * - associative: `f(a, f(b, c)) == f(f(a, b), c)`
 *
 * It's unsafe to execute side effects inside `f`, as `f` may be executed
 * more than once for some of `in` elements during effect execution.
 */
export const mergeAllPar = <A, B>(b: B, f: (b: B, a: A) => B) => <R, E>(
  fas: Iterable<IO<R, E, A>>
): IO<R, E, B> => mergeAllPar_(fas, b, f);

/**
 * Merges an `Iterable<IO>` to a single IO, working in with up to `n` fibers in parallel.
 *
 * Due to the parallel nature of this combinator, `f` must be both:
 * - commutative: `f(a, b) == f(b, a)`
 * - associative: `f(a, f(b, c)) == f(f(a, b), c)`
 *
 * It's unsafe to execute side effects inside `f`, as `f` may be executed
 * more than once for some of `in` elements during effect execution.
 */
export const mergeAllParN_ = (n: number) => <R, E, A, B>(
  fas: Iterable<IO<R, E, A>>,
  b: B,
  f: (b: B, a: A) => B
): IO<R, E, B> =>
  chain_(XR.make(b), (acc) =>
    chain_(
      foreachUnitParN_(n)(
        fas,
        chain((a) =>
          pipe(
            acc,
            XR.update((b) => f(b, a))
          )
        )
      ),
      () => acc.get
    )
  );

/**
 * Merges an `Iterable<IO>` to a single IO, working in with up to `n` fibers in parallel.
 *
 * Due to the parallel nature of this combinator, `f` must be both:
 * - commutative: `f(a, b) == f(b, a)`
 * - associative: `f(a, f(b, c)) == f(f(a, b), c)`
 *
 * It's unsafe to execute side effects inside `f`, as `f` may be executed
 * more than once for some of `in` elements during effect execution.
 */
export const mergeAllParN = (n: number) => <A, B>(b: B, f: (b: B, a: A) => B) => <R, E>(
  fas: Iterable<IO<R, E, A>>
): IO<R, E, B> => mergeAllParN_(n)(fas, b, f);
