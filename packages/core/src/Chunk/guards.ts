import type { Chunk, NonEmptyChunk, TypedArray } from "./model";

export function isTyped(chunk: Chunk<unknown>): chunk is TypedArray {
  return "subarray" in chunk;
}

export function isEmpty<A>(as: Chunk<A>): boolean {
  return as.length === 0;
}

export function isNonEmpty<A>(as: Chunk<A>): as is NonEmptyChunk<A> {
  return as.length > 0;
}
