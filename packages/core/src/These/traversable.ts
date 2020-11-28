import * as P from "@principia/prelude";
import { identity } from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import { both, right } from "./constructors";
import { Functor } from "./functor";
import { isLeft, isRight } from "./guards";
import type { URI, V } from "./model";

/*
 * -------------------------------------------
 * Traversable These
 * -------------------------------------------
 */

export const traverse_ = P.implementTraverse_<[URI], V>()((_) => (G) => {
  const pure = P.pureF(G);
  return (ta, f) => {
    return isLeft(ta)
      ? pure(ta)
      : isRight(ta)
      ? G.map_(f(ta.right), right)
      : G.map_(f(ta.right), (b) => both(ta.left, b));
  };
});

export const traverse: P.TraverseFn<[URI], V> = (G) => {
  const traverseG_ = traverse_(G);
  return (f) => (ta) => traverseG_(ta, f);
};

export const sequence = P.implementSequence<[URI], V>()((_) => (G) => traverse(G)(identity));

export const Traversable: P.Traversable<[URI], V> = HKT.instance({
  ...Functor,
  traverse_,
  traverse,
  sequence
});
