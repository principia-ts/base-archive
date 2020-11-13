import { pipe } from "@principia/prelude";

import * as T from "../_internal/_task";
import * as I from "../../../Iterable";
import { parallelN } from "../../ExecutionStrategy";
import { mapBothPar_ } from "../apply-par";
import { mapBoth_ } from "../apply-seq";
import { succeed } from "../constructors";
import { mapM } from "../functor";
import type { Managed } from "../model";
import { makeManagedReleaseMap } from "./makeManagedReleaseMap";

/**
 * Merges an `Iterable<Managed>` to a single `Managed`, working sequentially.
 */
export function mergeAll_<R, E, A, B>(mas: Iterable<Managed<R, E, A>>, b: B, f: (b: B, a: A) => B): Managed<R, E, B> {
   return I.reduce_(mas, succeed(b) as Managed<R, E, B>, (b, a) => mapBoth_(b, a, f));
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
   return I.reduce_(mas, succeed(b) as Managed<R, E, B>, (b, a) => mapBothPar_(b, a, f));
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
   return <R, E, A, B>(mas: Iterable<Managed<R, E, A>>, b: B, f: (b: B, a: A) => B): Managed<R, E, B> =>
      pipe(
         makeManagedReleaseMap(parallelN(n)),
         mapM((rm) =>
            pipe(
               mas,
               I.map((m) => T.map_(m.task, ([_, a]) => a)),
               T.mergeAllParN(n)(b, f),
               T.gives((_: R) => [_, rm] as const)
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
): <A, B>(b: B, f: (b: B, a: A) => B) => <R, E>(mas: Iterable<Managed<R, E, A>>) => Managed<R, E, B> {
   return (b, f) => (mas) => mergeAllParN_(n)(mas, b, f);
}
