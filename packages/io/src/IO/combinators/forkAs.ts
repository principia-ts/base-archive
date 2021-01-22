import type { IO, URIO } from '../core'

import { pipe } from '@principia/base/Function'
import * as O from '@principia/base/Option'

import * as Fiber from '../../Fiber'
import * as FiberRef from '../../FiberRef'
import { bind, fork } from '../core'
import { uninterruptibleMask } from './interrupt'

/**
 * Forks the effect into a new independent fiber, with the specified name.
 */
export function forkAs_<R, E, A>(ma: IO<R, E, A>, name: string): URIO<R, Fiber.FiberContext<E, A>> {
  return uninterruptibleMask(({ restore }) =>
    pipe(
      Fiber.fiberName,
      FiberRef.set(O.some(name)),
      bind(() => fork(restore(ma)))
    )
  )
}

/**
 * Forks the effect into a new independent fiber, with the specified name.
 */
export function forkAs(name: string): <R, E, A>(ma: IO<R, E, A>) => URIO<R, Fiber.FiberContext<E, A>> {
  return (ma) => forkAs_(ma, name)
}
