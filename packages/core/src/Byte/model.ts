import * as NT from "@principia/prelude/Newtype";

import type { Chunk } from "../Chunk";
import { unsafeCoerce } from "../Function";

export const Byte = NT.typeDef<number>()("Byte");
export interface Byte extends NT.TypeOf<typeof Byte> {}

/**
 * @optimize identity
 */
export function fromNumber(n: number): Byte {
  return Byte.wrap(n);
}

/**
 * @optimize identity
 */
export function chunk(buf: Buffer): Chunk<Byte> {
  return unsafeCoerce(buf);
}

/**
 * @optimize identity
 */
export function buffer(chunk: Chunk<Byte>): Buffer {
  return unsafeCoerce(chunk);
}
