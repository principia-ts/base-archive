import type * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import { both, left, right } from "./constructors";
import { Functor } from "./functor";
import { isBoth, isLeft, isRight } from "./guards";
import type { These, URI, V } from "./model";

/*
 * -------------------------------------------
 * Bifunctor These
 * -------------------------------------------
 */

export function bimap_<E, A, G, B>(pab: These<E, A>, f: (e: E) => G, g: (a: A) => B): These<G, B> {
  return isLeft(pab)
    ? left(f(pab.left))
    : isRight(pab)
    ? right(g(pab.right))
    : both(f(pab.left), g(pab.right));
}

export function bimap<E, A, G, B>(
  f: (e: E) => G,
  g: (a: A) => B
): (pab: These<E, A>) => These<G, B> {
  return (pab) => bimap_(pab, f, g);
}

export function mapLeft_<E, A, G>(pab: These<E, A>, f: (e: E) => G): These<G, A> {
  return isLeft(pab) ? left(f(pab.left)) : isBoth(pab) ? both(f(pab.left), pab.right) : pab;
}

export function mapLeft<E, G>(f: (e: E) => G): <A>(pab: These<E, A>) => These<G, A> {
  return (pab) => mapLeft_(pab, f);
}

export function swap<E, A>(pab: These<E, A>): These<A, E> {
  return isLeft(pab) ? right(pab.left) : isRight(pab) ? left(pab.right) : both(pab.right, pab.left);
}

export const Bifunctor: P.Bifunctor<[URI], V> = HKT.instance({
  ...Functor,
  bimap_,
  bimap,
  mapLeft_,
  mapLeft
});
