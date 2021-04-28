import * as P from '@principia/prelude'

import { createCircularEqualCreator, createComparator } from './internal/equatable'

export function isEquatable(u: unknown): u is P.Equatable {
  return P.isObject(u) && P.$equals in u
}

export const deepEquals = createComparator(
  createCircularEqualCreator((eq) => (a, b, meta) => {
    if (isEquatable(a)) {
      return a[P.$equals](b)
    } else {
      return eq(a, b, meta)
    }
  })
)

export function equals(a: unknown, b: unknown): boolean {
  if (isEquatable(a)) {
    return a[P.$equals](b)
  } else if (isEquatable(b)) {
    return b[P.$equals](a)
  }
  return a === b
}

export * from '@principia/prelude/Equatable'
