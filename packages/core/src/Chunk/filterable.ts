import * as A from "../Array";
import type { Predicate, Refinement } from "../Function";
import type * as O from "../Option";
import { fromBuffer } from "./constructors";
import { isTyped } from "./guards";
import type { Chunk } from "./model";

export function filter_<A, B extends A>(fa: Chunk<A>, refinement: Refinement<A, B>): Chunk<B>;
export function filter_<A>(fa: Chunk<A>, predicate: Predicate<A>): Chunk<A>;
export function filter_<A>(fa: Chunk<A>, predicate: Predicate<A>): Chunk<A> {
  if (isTyped(fa)) {
    return fromBuffer(fa.filter(predicate as any));
  }
  if (Array.isArray(fa)) {
    return fa.filter(predicate);
  }
  return Array.from(fa).filter(predicate);
}

export function filter<A, B extends A>(refinement: Refinement<A, B>): (fa: Chunk<A>) => Chunk<B>;
export function filter<A>(predicate: Predicate<A>): (fa: Chunk<A>) => Chunk<A>;
export function filter<A>(predicate: Predicate<A>): (fa: Chunk<A>) => Chunk<A> {
  return (fa) => filter_(fa, predicate);
}

export function filterMap_<A, B>(fa: Chunk<A>, f: (a: A) => O.Option<B>): Chunk<B> {
  if (Array.isArray(fa)) {
    return A.filterMap_(Array.from(fa), f);
  }
  return A.filterMap_(Array.from(fa), f);
}

export function filterMap<A, B>(f: (a: A) => O.Option<B>): (fa: Chunk<A>) => Chunk<B> {
  return (self) => filterMap_(self, f);
}
