import type * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import { identity } from "../Function";
import { Functor, map_ } from "./functor";
import type { URI, V } from "./model";
import { unit } from "./unit";

/*
 * -------------------------------------------
 * Monad Identity
 * -------------------------------------------
 */

export function chain_<A, B>(ma: A, f: (a: A) => B): B {
  return f(ma);
}

export function chain<A, B>(f: (a: A) => B): (ma: A) => B {
  return (ma) => f(ma);
}

export function tap_<A, B>(ma: A, f: (a: A) => B): A {
  return chain_(ma, (a) => map_(f(a), () => a));
}

export function tap<A, B>(f: (a: A) => B): (ma: A) => A {
  return (ma) => tap_(ma, f);
}

export function flatten<A>(mma: A): A {
  return chain_(mma, identity);
}

export const Monad: P.Monad<[URI], V> = HKT.instance({
  ...Functor,
  unit,
  flatten
});
