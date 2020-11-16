import type { Separated } from "@principia/prelude/Utils";

import * as A from "../Array/_core";
import type { Either } from "../Either";
import type { PredicateWithIndex } from "../Function";
import { Predicate } from "../Function";
import { map_, mapWithIndex_ } from "./functor";
import { iterable } from "./utils";

/*
 * -------------------------------------------
 * Filterable Iterable
 * -------------------------------------------
 */

export function filterWithIndex_<A>(fa: Iterable<A>, predicate: PredicateWithIndex<number, A>): Iterable<A> {
   return iterable(function* () {
      let i = 0;
      for (const el of fa) {
         if (predicate(i, el)) {
            yield el;
         }
         i++;
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
         for (const el of mapped) {
            if (el._tag === "Left") {
               yield el.left;
            }
         }
      }),
      right: iterable(function* () {
         for (const el of mapped) {
            if (el._tag === "Right") {
               yield el.right;
            }
         }
      })
   };
}

export function partitionMap<A, B, C>(
   f: (a: A) => Either<B, C>
): (as: Iterable<A>) => Separated<Iterable<B>, Iterable<C>> {
   return (as) => partitionMapWithIndex_(as, (_, a) => f(a));
}
