import type { Ord } from "@principia/prelude/Ord";
import { toNumber } from "@principia/prelude/Ordering";

/*
 * -------------------------------------------
 * Set Destructors
 * -------------------------------------------
 */

export function toArray<A>(O: Ord<A>): (set: ReadonlySet<A>) => ReadonlyArray<A> {
  return (set) => {
    const r: Array<A> = [];
    set.forEach((e) => r.push(e));
    return r.sort((a, b) => toNumber(O.compare(a)(b)));
  };
}

export function toSet<A>(s: ReadonlySet<A>): Set<A> {
  return new Set(s);
}
