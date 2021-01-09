import type { Managed } from '../core'
import type { Finalizer } from '../ReleaseMap'

import { pipe } from '@principia/base/Function'

import * as I from '../_internal/io'
import { map } from '../core'
import { releaseMap } from './releaseMap'

export class ManagedScope {
  constructor(readonly apply: <R, E, A>(managed: Managed<R, E, A>) => I.IO<R, E, readonly [Finalizer, A]>) {}
}

export function scope(): Managed<unknown, never, ManagedScope> {
  return pipe(
    releaseMap,
    map(
      (finalizers) =>
        new ManagedScope(
          <R, E, A>(managed: Managed<R, E, A>): I.IO<R, E, readonly [Finalizer, A]> =>
            I.flatMap_(I.ask<R>(), (r) => I.giveAll_(managed.io, [r, finalizers] as const))
        )
    )
  )
}
