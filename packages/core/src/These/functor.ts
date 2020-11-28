import type * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import { both, right } from "./constructors";
import { isLeft, isRight } from "./guards";
import type { These, URI, V } from "./model";

/*
 * -------------------------------------------
 * Functor These
 * -------------------------------------------
 */

export function map_<E, A, B>(fa: These<E, A>, f: (a: A) => B): These<E, B> {
  return isLeft(fa) ? fa : isRight(fa) ? right(f(fa.right)) : both(fa.left, f(fa.right));
}

export function map<A, B>(f: (a: A) => B): <E>(fa: These<E, A>) => These<E, B> {
  return (fa) => map_(fa, f);
}

export const Functor: P.Functor<[URI], V> = HKT.instance({
  map_,
  map
});
