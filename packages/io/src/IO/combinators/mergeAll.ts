import type { IO } from '../core'

import * as I from '@principia/base/data/Iterable'

import { map2_, pure } from '../core'

/**
 * Merges an `Iterable<IO>` to a single IO, working sequentially.
 */
export const mergeAll_ = <R, E, A, B>(fas: Iterable<IO<R, E, A>>, b: B, f: (b: B, a: A) => B): IO<R, E, B> =>
  I.foldLeft_(fas, pure(b) as IO<R, E, B>, (_b, a) => map2_(_b, a, f))

/**
 * Merges an `Iterable<IO>` to a single IO, working sequentially.
 */
export const mergeAll = <A, B>(b: B, f: (b: B, a: A) => B) => <R, E>(fas: Iterable<IO<R, E, A>>): IO<R, E, B> =>
  mergeAll_(fas, b, f)
