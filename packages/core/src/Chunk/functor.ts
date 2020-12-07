import type { Chunk } from "./model";

export function map_<A, B>(fa: Chunk<A>, f: (a: A) => B): Chunk<B> {
  if (Array.isArray(fa)) {
    return fa.map(f);
  }
  return Array.from(fa).map(f);
}

export function map<A, B>(f: (a: A) => B) {
  return (self: Chunk<A>) => map_(self, f);
}
