import type { NonEmptyArray } from '../NonEmptyArray'
import type { Mutable } from '../prelude'

export function isNonEmpty<A>(as: ReadonlyArray<A>): as is NonEmptyArray<A> {
  return as.length > 0
}

export function makeBy<A>(n: number, f: (i: number) => A): NonEmptyArray<A> {
  const j   = Math.max(0, Math.floor(n))
  const out = [f(0)] as Mutable<NonEmptyArray<A>>
  for (let i = 1; i < j; i++) {
    out.push(f(i))
  }
  return out
}
