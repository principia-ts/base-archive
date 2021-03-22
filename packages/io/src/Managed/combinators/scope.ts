import type { Managed } from '../core'
import type { Finalizer } from '../ReleaseMap'

import { pipe } from '@principia/base/function'
import { tuple } from '@principia/base/tuple'

import { map } from '../core'
import * as I from '../internal/io'
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
            pipe(
              I.ask<R>(),
              I.bind((r) => I.giveAll_(managed.io, tuple(r, finalizers)))
            )
        )
    )
  )
}
