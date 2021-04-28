import type { Managed } from '../core'
import type { Finalizer } from '../ReleaseMap'

import { tuple } from '@principia/prelude/tuple'

import { pipe } from '../../function'
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
