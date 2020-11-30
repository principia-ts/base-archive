import * as P from "@principia/prelude";
import { identity } from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import { prepend_ } from "./combinators";
import { empty } from "./constructors";
import { reduceRight_ } from "./foldable";
import { Functor } from "./functor";
import type { URI, V } from "./model";

/*
 * -------------------------------------------
 * Traversable List
 * -------------------------------------------
 */

export const traverse_ = P.implementTraverse_<[URI], V>()((_) => (G) => (ta, f) =>
  reduceRight_(ta, P.pureF(G)(empty()), (a, fb) =>
    G.map_(G.zip_(f(a), fb), ([b, l]) => prepend_(l, b))
  )
);

export const traverse: P.TraverseFn<[URI], V> = (G) => {
  const traverseG_ = traverse_(G);
  return (f) => (ta) => traverseG_(ta, f);
};

export const sequence = P.implementSequence<[URI], V>()(() => (G) => traverse(G)(identity));

export const Traversable: P.Traversable<[URI], V> = HKT.instance({
  ...Functor,
  traverse_,
  traverse,
  sequence
});
