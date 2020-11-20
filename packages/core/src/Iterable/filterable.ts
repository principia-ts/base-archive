import type { Separated } from "@principia/prelude/Utils";

import type { Either } from "../Either";
import type { PredicateWithIndex } from "../Function";
import { mapWithIndex_ } from "./functor";
import { iterable } from "./utils";

/*
 * -------------------------------------------
 * Filterable Iterable
 * -------------------------------------------
 */

export function filterWithIndex_<A>(
  fa: Iterable<A>,
  predicate: PredicateWithIndex<number, A>
): Iterable<A> {
  return iterable(function* () {
    let i = -1;
    const iterator = fa[Symbol.iterator]();
    while (true) {
      const result = iterator.next();
      if (result.done) break;
      i += 1;
      if (predicate(i, result.value)) yield result.value;
    }
  });
}

export function partitionMapWithIndex_<A, B, C>(
  fa: Iterable<A>,
  f: (i: number, a: A) => Either<B, C>
): Separated<Iterable<B>, Iterable<C>> {
  const mapped = mapWithIndex_(fa, f);
  return {
    left: iterable(function* () {
      const iterator = mapped[Symbol.iterator]();
      while (true) {
        const result = iterator.next();
        if (result.done) break;
        if (result.value._tag === "Left") yield result.value.left;
      }
    }),
    right: iterable(function* () {
      const iterator = mapped[Symbol.iterator]();
      while (true) {
        const result = iterator.next();
        if (result.done) break;
        if (result.value._tag === "Right") yield result.value.right;
      }
    })
  };
}

export function partitionMap<A, B, C>(
  f: (a: A) => Either<B, C>
): (as: Iterable<A>) => Separated<Iterable<B>, Iterable<C>> {
  return (as) => partitionMapWithIndex_(as, (_, a) => f(a));
}
