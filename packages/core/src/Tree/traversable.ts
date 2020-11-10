import type { SequenceFn, TraverseFn, TraverseFn_ } from "@principia/prelude";
import { apF_, implementTraverse_ } from "@principia/prelude";
import type * as HKT from "@principia/prelude/HKT";

import * as A from "../Array";
import { identity } from "../Function";
import type { Forest, Tree, URI, V } from "./model";

/*
 * -------------------------------------------
 * Traversable Tree
 * -------------------------------------------
 */

export const traverse_: TraverseFn_<[URI], V> = implementTraverse_<[URI], V>()((_) => (G) => {
   const traverseG = A.traverse_(G);
   const out = <A, B>(ta: Tree<A>, f: (a: A) => HKT.HKT<typeof _.G, B>): HKT.HKT<typeof _.G, Tree<B>> =>
      apF_(G)(
         G.map_(f(ta.value), (value) => (forest: Forest<B>) => ({
            value,
            forest
         })),
         traverseG(ta.forest, (a) => out(a, f))
      );
   return out;
});

export const traverse: TraverseFn<[URI], V> = (G) => (f) => (ta) => traverse_(G)(ta, f);

export const sequence: SequenceFn<[URI], V> = (G) => (ta) => traverse_(G)(ta, identity);
