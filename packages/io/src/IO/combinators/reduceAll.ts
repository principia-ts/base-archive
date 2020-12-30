import type { IO } from '../core'

import * as A from '@principia/base/data/Array'
import * as NA from '@principia/base/data/NonEmptyArray'

import { map2_ } from '../core'

export function reduceAll_<R, E, A>(as: NA.NonEmptyArray<IO<R, E, A>>, f: (b: A, a: A) => A) {
  return A.foldLeft_(NA.tail(as), NA.head(as), (b, a) => map2_(b, a, f))
}

export function reduceAll<A>(f: (b: A, a: A) => A): <R, E>(as: NA.NonEmptyArray<IO<R, E, A>>) => IO<R, E, A> {
  return (as) => reduceAll_(as, f)
}
