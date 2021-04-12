import type * as DE from './DecodeError'
import type { RoseTree } from '@principia/base/RoseTree'

import { pipe } from '@principia/base/function'
import * as M from '@principia/base/Multi'

type Warning = RoseTree<DE.Warning>

export interface Result<E, A> extends M.Multi<Warning, unknown, never, unknown, E, A> {}

export function succeed<E = never, A = never>(a: A, w: DE.Warnings = []): Result<E, A> {
  return pipe(
    M.tellAll(w),
    M.bind(() => M.succeed(a))
  )
}

export function fail<E = never, A = never>(e: E, w: DE.Warnings = []): Result<E, A> {
  return pipe(
    M.tellAll(w),
    M.bind(() => M.fail(e))
  )
}