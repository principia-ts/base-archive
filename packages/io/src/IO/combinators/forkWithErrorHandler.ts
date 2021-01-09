import type { FiberContext } from '../../Fiber'
import type { IO, URIO } from '../core'

import * as E from '@principia/base/data/Either'
import { flow, pipe } from '@principia/base/data/Function'

import * as C from '../../Cause/core'
import { fork, halt } from '../core'
import { onError } from './onError'

export function forkWithErrorHandler_<R, E, A, R1>(ma: IO<R, E, A>, handler: (e: E) => URIO<R1, void>) {
  return pipe(ma, onError(flow(C.failureOrCause, E.fold(handler, halt))), fork)
}

export function forkWithErrorHandler<E, R1>(
  handler: (e: E) => URIO<R1, void>
): <R, A>(ma: IO<R, E, A>) => URIO<R & R1, FiberContext<E, A>> {
  return (ma) => forkWithErrorHandler_(ma, handler)
}
