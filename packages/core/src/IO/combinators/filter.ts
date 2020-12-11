import * as I from "../../Iterable";
import { pure, zipWith_ } from "../_core";
import type { IO } from "../model";

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
  return I.reduce_(as, pure([]) as IO<R, E, A[]>, (ma, a) =>
    zipWith_(ma, f(a), (as_, p) => {
      if (p) {
        as_.push(a);
      }
      return as_;
    })
  );
}
