import * as A from "../../Array/_core";
import { pipe } from "../../Function";
import * as I from "../../Iterable";
import * as O from "../../Option";
import { map, map_ } from "../_core";
import type { IO } from "../model";
import { foreachPar } from "./foreachPar";

/**
 * Filters the collection in parallel using the specified effectual predicate.
 * See `filter` for a sequential version of it.
 */
export function filterPar_<A, R, E>(as: Iterable<A>, f: (a: A) => IO<R, E, boolean>) {
  return pipe(
    as,
    foreachPar((a) => map_(f(a), (b) => (b ? O.some(a) : O.none()))),
    map(A.compact)
  );
}

/**
 * Filters the collection in parallel using the specified effectual predicate.
 * See `filter` for a sequential version of it.
 */
export function filterPar<A, R, E>(
  f: (a: A) => IO<R, E, boolean>
): (as: Iterable<A>) => IO<R, E, readonly A[]> {
  return (as) => filterPar_(as, f);
}
