import * as Ex from '../../Exit'
import { chain_, Managed } from '../core'
import * as I from '../internal/io'
import { fiberId } from './fiberId'

export function withEarlyReleaseExit_<R, E, A>(
  ma: Managed<R, E, A>,
  exit: Ex.Exit<any, any>
): Managed<R, E, readonly [I.UIO<unknown>, A]> {
  return new Managed(
    I.map_(ma.io, ([finalizer, a]) => [finalizer, [I.makeUninterruptible(finalizer(exit)), a]] as const)
  )
}

export function withEarlyReleaseExit(
  exit: Ex.Exit<any, any>
): <R, E, A>(ma: Managed<R, E, A>) => Managed<R, E, readonly [I.UIO<unknown>, A]> {
  return (ma) => withEarlyReleaseExit_(ma, exit)
}

export function withEarlyRelease<R, E, A>(ma: Managed<R, E, A>): Managed<R, E, readonly [I.UIO<unknown>, A]> {
  return chain_(fiberId(), (id) => withEarlyReleaseExit_(ma, Ex.interrupt(id)))
}
