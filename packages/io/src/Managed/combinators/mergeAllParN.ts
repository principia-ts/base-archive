import type { Managed } from "../core";

import { pipe } from "@principia/base/data/Function";
import * as Iter from "@principia/base/data/Iterable";

import { parallelN } from "../../ExecutionStrategy";
import * as I from "../_internal/_io";
import { mapM } from "../core";
import { makeManagedReleaseMap } from "./makeManagedReleaseMap";

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
