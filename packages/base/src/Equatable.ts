import { createCircularEqualCreator, createComparator } from './internal/HasEquals'
import { isObject } from './util/predicates'

export const $equals = Symbol.for('$equals')

export interface Equatable {
  [$equals](that: any): boolean
}

export function isEquatable(u: unknown): u is Equatable {
  return isObject(u) && $equals in u
}

export const deepEquals = createComparator(
  createCircularEqualCreator((eq) => (a, b, meta) => {
    if (isEquatable(a)) {
      return a[$equals](b)
    } else {
      return eq(a, b, meta)
    }
  })
)

export function equals(a: unknown, b: unknown): boolean {
  if (isEquatable(a)) {
    return a[$equals](b)
  } else if (isEquatable(b)) {
    return b[$equals](a)
  }
  return a === b
}
