import { fromEquals } from "@principia/prelude/Eq";

import type { Eq } from "./model";

/*
 * -------------------------------------------
 * Contravariant Eq
 * -------------------------------------------
 */

export function contramap_<A, B>(fa: Eq<A>, f: (b: B) => A): Eq<B> {
  return fromEquals((x, y) => fa.equals_(f(x), f(y)));
}

export function contramap<A, B>(f: (b: B) => A): (fa: Eq<A>) => Eq<B> {
  return (fa) => contramap_(fa, f);
}
