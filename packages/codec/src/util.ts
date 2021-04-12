/*
 * -------------------------------------------
 * internal
 * -------------------------------------------
 */

/**
 * @internal
 */
export function typeOf(x: unknown): string {
  return x === null ? 'null' : typeof x
}

/**
 * @internal
 */
export function _intersect<A, B>(a: A, b: B): A & B {
  if (a !== undefined && b !== undefined) {
    const tx = typeOf(a)
    const ty = typeOf(b)
    if (tx === 'object' || ty === 'object') {
      return Object.assign({}, a, b)
    }
  }
  return b as any
}

export interface IndexMap {
  '0': 0
  '1': 1
  '2': 2
  '3': 3
  '4': 4
  '5': 5
  '6': 6
  '7': 7
  '8': 8
  '9': 9
  '10': 10
  '11': 11
  '12': 12
  '13': 13
  '14': 14
  '15': 15
  '16': 16
  '17': 17
  '18': 18
  '19': 19
  '20': 20
}

export type CastToNumber<T> = T extends keyof IndexMap ? IndexMap[T] : number;