import type * as DE from './DecodeError'
import type { RoseTree } from '@principia/base/RoseTree'

import { pipe } from '@principia/base/function'
import * as Z from '@principia/base/Z'

type Warning = RoseTree<DE.Warning>

export interface Result<E, A> extends Z.Z<Warning, unknown, unknown, unknown, E, A> {}

export function succeed<E = never, A = never>(a: A, w: DE.Warnings = []): Result<E, A> {
  return pipe(
    Z.tellAll(w),
    Z.bind(() => Z.succeed(a))
  )
}

export function fail<E = never, A = never>(e: E, w: DE.Warnings = []): Result<E, A> {
  return pipe(
    Z.tellAll(w),
    Z.bind(() => Z.fail(e))
  )
}