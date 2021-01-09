import type { Managed } from '../core'

import { tuple } from '@principia/base/Function'

import { sequential } from '../../ExecutionStrategy'
import * as I from '../_internal/io'
import * as RM from '../ReleaseMap'
import { releaseAll } from './releaseAll'

/**
 * Run an effect while acquiring the resource before and releasing it after
 */
export function use<A, R2, E2, B>(
  f: (a: A) => I.IO<R2, E2, B>
): <R, E>(self: Managed<R, E, A>) => I.IO<R & R2, E | E2, B> {
  return (self) => use_(self, f)
}

/**
 * Run an effect while acquiring the resource before and releasing it after
 */
export function use_<R, E, A, R2, E2, B>(
  self: Managed<R, E, A>,
  f: (a: A) => I.IO<R2, E2, B>
): I.IO<R & R2, E | E2, B> {
  return I.bracketExit_(
    RM.make,
    (rm) =>
      I.flatMap_(
        I.gives_(self.io, (r: R) => tuple(r, rm)),
        (a) => f(a[1])
      ),
    (rm, ex) => releaseAll(ex, sequential)(rm)
  )
}

/**
 * Runs the acquire and release actions and returns the result of this
 * managed effect. Note that this is only safe if the result of this managed
 * effect is valid outside its scope.
 */
export const useNow: <R, E, A>(ma: Managed<R, E, A>) => I.IO<R, E, A> = use(I.pure)

/**
 * Use the resource until interruption.
 * Useful for resources that you want to acquire and use as long as the application is running, like a HTTP server.
 */
export const useForever: <R, E, A>(ma: Managed<R, E, A>) => I.IO<R, E, never> = use(() => I.never)
