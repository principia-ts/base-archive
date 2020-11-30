import { pipe } from "@principia/prelude";

import { parallelN } from "../../IO/ExecutionStrategy";
import * as Iter from "../../Iterable";
import * as I from "../_internal/_io";
import { zipWithPar_ } from "../apply-par";
import { zipWith_ } from "../apply-seq";
import { succeed } from "../constructors";
import { mapM } from "../functor";
import type { Managed } from "../model";
import { makeManagedReleaseMap } from "./makeManagedReleaseMap";

/**
 * Merges an `Iterable<Managed>` to a single `Managed`, working sequentially.
 */
export function mergeAll_<R, E, A, B>(
  mas: Iterable<Managed<R, E, A>>,
  b: B,
  f: (b: B, a: A) => B
): Managed<R, E, B> {
  return Iter.reduce_(mas, succeed(b) as Managed<R, E, B>, (b, a) => zipWith_(b, a, f));
}

/**
 * Merges an `Iterable<Managed>` to a single `Managed`, working sequentially.
 */
export function mergeAll<A, B>(
  b: B,
  f: (b: B, a: A) => B
): <R, E>(mas: Iterable<Managed<R, E, A>>) => Managed<R, E, B> {
  return (mas) => mergeAll_(mas, b, f);
}

/**
 * Merges an `Iterable<Managed>` to a single `Managed`, working in parallel.
 *
 * Due to the parallel nature of this combinator, `f` must be both:
 * - commutative: `f(a, b) == f(b, a)`
 * - associative: `f(a, f(b, c)) == f(f(a, b), c)`
 */
export function mergeAllPar_<R, E, A, B>(
  mas: Iterable<Managed<R, E, A>>,
  b: B,
  f: (b: B, a: A) => B
): Managed<R, E, B> {
  return Iter.reduce_(mas, succeed(b) as Managed<R, E, B>, (b, a) => zipWithPar_(b, a, f));
}

/**
 * Merges an `Iterable<Managed>` to a single `Managed`, working in parallel.
 *
 * Due to the parallel nature of this combinator, `f` must be both:
 * - commutative: `f(a, b) == f(b, a)`
 * - associative: `f(a, f(b, c)) == f(f(a, b), c)`
 */
export function mergeAllPar<A, B>(
  b: B,
  f: (b: B, a: A) => B
): <R, E>(mas: Iterable<Managed<R, E, A>>) => Managed<R, E, B> {
  return (mas) => mergeAllPar_(mas, b, f);
}

/**
 * Merges an `Iterable<Managed>` to a single `Managed`, working in parallel.
 *
 * Due to the parallel nature of this combinator, `f` must be both:
 * - commutative: `f(a, b) == f(b, a)`
 * - associative: `f(a, f(b, c)) == f(f(a, b), c)`
 *
 * Unlike `mergeAllPar`, this method will use at most up to `n` fibers.
 */
export function mergeAllParN_(n: number) {
  return <R, E, A, B>(
    mas: Iterable<Managed<R, E, A>>,
    b: B,
    f: (b: B, a: A) => B
  ): Managed<R, E, B> =>
    pipe(
      makeManagedReleaseMap(parallelN(n)),
      mapM((rm) =>
        pipe(
          mas,
          Iter.map((m) => I.map_(m.io, ([_, a]) => a)),
          I.mergeAllParN(n)(b, f),
          I.gives((_: R) => [_, rm] as const)
        )
      )
    );
}

/**
 * Merges an `Iterable<Managed>` to a single `Managed`, working in parallel.
 *
 * Due to the parallel nature of this combinator, `f` must be both:
 * - commutative: `f(a, b) == f(b, a)`
 * - associative: `f(a, f(b, c)) == f(f(a, b), c)`
 *
 * Unlike `mergeAllPar`, this method will use at most up to `n` fibers.
 */
export function mergeAllParN(
  n: number
): <A, B>(
  b: B,
  f: (b: B, a: A) => B
) => <R, E>(mas: Iterable<Managed<R, E, A>>) => Managed<R, E, B> {
  return (b, f) => (mas) => mergeAllParN_(n)(mas, b, f);
}
