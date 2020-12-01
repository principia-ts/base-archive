import type * as P from "@principia/prelude";
import { identity } from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import { Functor, map_ } from "./functor";
import type { State, URI, V } from "./model";
import { unit } from "./unit";

/*
 * -------------------------------------------
 * Functor State
 * -------------------------------------------
 */

export function chain_<S, A, B>(ma: State<S, A>, f: (a: A) => State<S, B>): State<S, B> {
  return (s) => {
    const [a, s2] = ma(s);
    return f(a)(s2);
  };
}

export function chain<S, A, B>(f: (a: A) => State<S, B>): (ma: State<S, A>) => State<S, B> {
  return (ma) => chain_(ma, f);
}

export function tap_<S, A, B>(ma: State<S, A>, f: (a: A) => State<S, B>): State<S, A> {
  return chain_(ma, (a) => map_(f(a), () => a));
}

export function tap<S, A, B>(f: (a: A) => State<S, B>): (ma: State<S, A>) => State<S, A> {
  return (ma) => tap_(ma, f);
}

export function flatten<S, A>(mma: State<S, State<S, A>>): State<S, A> {
  return chain_(mma, identity);
}

export const Monad: P.Monad<[URI], V> = HKT.instance({
  ...Functor,
  flatten,
  unit
});
