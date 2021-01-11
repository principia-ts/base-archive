import type { IO } from '../core'
import type { Monoid } from '@principia/base/Monoid'
import type * as NA from '@principia/base/NonEmptyArray'

import * as O from '@principia/base/Option'
import { NoSuchElementException } from '@principia/base/util/GlobalExceptions'

import { map_ } from '../core'
import { mergeAllPar_ } from './mergeAllPar'

/**
 * Combines an array of `IO`s in parallel using a `Monoid`
 *
 * @category Combinators
 * @since 1.0.0
 */
export function foldMapPar_<M>(
  M: Monoid<M>
): <R, E, A>(as: Iterable<IO<R, E, A>>, f: (a: A) => M) => IO<R, E, M> {
  return (as, f) => mergeAllPar_(as, M.nat, (m, a) => M.combine_(m, f(a)))
}

/**
 * Combines an array of `IO`s in parallel using a `Monoid`
 *
 * @category Combinators
 * @since 1.0.0
 */
export function foldMapPar<M>(
  M: Monoid<M>
): <A>(f: (a: A) => M) => <R, E>(as: Iterable<IO<R, E, A>>) => IO<R, E, M> {
  return (f) => (as) => foldMapPar_(M)(as, f)
}
