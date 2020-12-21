import type { IO } from "../core";

import * as I from "../../Iterable";
import { map2_, pure } from "../core";

/**
 * Filters the collection using the specified effectual predicate.
 */
export function filter<A, R, E>(f: (a: A) => IO<R, E, boolean>) {
  return (as: Iterable<A>) => filter_(as, f);
}

/**
 * Filters the collection using the specified effectual predicate.
 */
export function filter_<A, R, E>(
  as: Iterable<A>,
  f: (a: A) => IO<R, E, boolean>
): IO<R, E, readonly A[]> {
  return I.foldLeft_(as, pure([]) as IO<R, E, A[]>, (ma, a) =>
    map2_(ma, f(a), (as_, p) => {
      if (p) {
        as_.push(a);
      }
      return as_;
    })
  );
}
