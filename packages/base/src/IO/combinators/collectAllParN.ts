// tracing: off

import type { Chunk } from '../../Chunk/core'
import type { IO } from '../core'

import { accessCallTrace, traceCall } from '@principia/compile/util'
import { identity } from '@principia/prelude/function'

import { foreachParN_ } from './foreachParN'
import { foreachUnitParN_ } from './foreachUnitParN'

/**
 * @trace call
 */
export function collectAllParN_<R, E, A>(mas: Iterable<IO<R, E, A>>, n: number): IO<R, E, Chunk<A>> {
  const trace = accessCallTrace()
  return traceCall(foreachParN_, trace)(mas, n, identity)
}

/**
 * @trace call
 */
export function collectAllParN(n: number): <R, E, A>(mas: Iterable<IO<R, E, A>>) => IO<R, E, Chunk<A>> {
  return (mas) => collectAllParN_(mas, n)
}

/**
 * @trace call
 */
export function collectAllUnitParN_<R, E, A>(mas: Iterable<IO<R, E, A>>, n: number): IO<R, E, void> {
  const trace = accessCallTrace()
  return traceCall(foreachUnitParN_, trace)(mas, n, identity)
}

/**
 * @trace call
 */
export function collectAllUnitParN(n: number): <R, E, A>(mas: Iterable<IO<R, E, A>>) => IO<R, E, void> {
  return (mas) => collectAllUnitParN_(mas, n)
}
