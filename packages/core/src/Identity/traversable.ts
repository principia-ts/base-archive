import * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import { identity, pipe } from "../Function";
import { Functor } from "./functor";
import type { URI, V } from "./model";

/*
 * -------------------------------------------
 * Traversable Identity
 * -------------------------------------------
 */

export const traverse_: P.TraverseFn_<[URI], V> = P.implementTraverse_<
  [URI],
  V
>()((_) => (G) => (ta, f) => pipe(f(ta), G.map(identity)));

export const traverse: P.TraverseFn<[URI], V> = (G) => {
  const traverseG_ = traverse_(G);
  return (f) => (ta) => traverseG_(ta, f);
};

export const sequence: P.SequenceFn<[URI], V> = (G) => (ta) => pipe(ta, G.map(identity));

export const Traversable: P.Traversable<[URI], V> = HKT.instance({
  ...Functor,
  traverse_,
  traverse,
  sequence
});
