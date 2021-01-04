import type { IO } from '../core'

import { flow } from '@principia/base/data/Function'

import { pure } from '../core'
import { retryWhileM_ } from './retryWhileM'

/**
 * Retries this effect while its error satisfies the specified predicate.
 */
export function retryWhile_<R, E, A>(fa: IO<R, E, A>, f: (e: E) => boolean) {
  return retryWhileM_(fa, flow(f, pure))
}

/**
 * Retries this effect while its error satisfies the specified predicate.
 */
export function retryWhile<E>(f: (e: E) => boolean): <R, A>(fa: IO<R, E, A>) => IO<R, E, A> {
  return (fa) => retryWhile_(fa, f)
}
