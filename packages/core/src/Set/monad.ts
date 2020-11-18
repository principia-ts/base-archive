import type { Eq } from "@principia/prelude/Eq";

import { identity } from "../Function";
import { elem } from "./guards";

/*
 * -------------------------------------------
 * Monad Set
 * -------------------------------------------
 */

export function chain_<B>(
  E: Eq<B>
): <A>(set: ReadonlySet<A>, f: (a: A) => ReadonlySet<B>) => ReadonlySet<B> {
  const elemE = elem(E);
  return (set, f) => {
    const r = new Set<B>();
    set.forEach((e) => {
      f(e).forEach((e) => {
        if (!elemE(e)(r)) {
          r.add(e);
        }
      });
    });
    return r;
  };
}

export function chain<B>(
  E: Eq<B>
): <A>(f: (a: A) => ReadonlySet<B>) => (set: ReadonlySet<A>) => ReadonlySet<B> {
  return (f) => (set) => chain_(E)(set, f);
}

export function flatten<A>(E: Eq<A>): (ma: ReadonlySet<ReadonlySet<A>>) => ReadonlySet<A> {
  const chainE = chain(E);
  return chainE(identity);
}
