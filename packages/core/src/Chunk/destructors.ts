import type { Byte } from "../Byte";
import * as O from "../Option";
import type { Chunk } from "./model";

export function asBuffer(chunk: Chunk<Byte>): Buffer {
  if (Buffer && Buffer.isBuffer(chunk)) {
    return chunk;
  }
  return Buffer.from(chunk);
}

export function asArray<A>(chunk: Chunk<A>): ReadonlyArray<A> {
  if (Array.isArray(chunk)) {
    return chunk;
  }
  return Array.from(chunk);
}

export function head<A>(as: Chunk<A>): O.Option<A> {
  return as.length > 0 ? O.some(as[0]) : O.none();
}

export function last<A>(as: Chunk<A>): O.Option<A> {
  return as.length > 0 ? O.some(as[as.length - 1]) : O.none();
}
