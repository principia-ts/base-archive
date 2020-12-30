import * as NT from '../Newtype'

export const Byte = NT.typeDef<number>()('Byte')
export interface Byte extends NT.TypeOf<typeof Byte> {}

/**
 * @optimize identity
 */
export function fromNumber(n: number): Byte {
  return Byte.wrap(n)
}

/**
 * @optimize identity
 */
export function toNumber(b: Byte): number {
  return Byte.unwrap(b)
}
