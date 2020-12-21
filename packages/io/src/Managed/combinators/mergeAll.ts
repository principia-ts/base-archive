import type { Managed } from "../core";

import * as Iter from "../../Iterable";
import { map2_, succeed } from "../core";

/**
 * Merges an `Iterable<Managed>` to a single `Managed`, working sequentially.
 */
export function mergeAll_<R, E, A, B>(
  mas: Iterable<Managed<R, E, A>>,
  b: B,
  f: (b: B, a: A) => B
): Managed<R, E, B> {
  return Iter.foldLeft_(mas, succeed(b) as Managed<R, E, B>, (b, a) => map2_(b, a, f));
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
