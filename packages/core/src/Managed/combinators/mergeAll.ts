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
