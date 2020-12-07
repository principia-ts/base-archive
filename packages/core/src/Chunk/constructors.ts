import * as A from "../Array";
import type { Chunk, TypedArray } from "./model";

export function fromBuffer<A>(id: TypedArray): Chunk<A> {
  return id as any;
}

export function empty<A>(): Chunk<A> {
  return [];
}

export function single<A>(a: A): Chunk<A> {
  return [a];
}

export const range: (start: number, end: number) => Chunk<number> = A.range;
