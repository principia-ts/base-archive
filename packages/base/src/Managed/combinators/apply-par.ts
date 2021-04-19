import type { ReadonlyRecord } from '../../Record'
import type { Managed } from '../core'
import type { _E, _R, EnforceNonEmptyRecord } from '@principia/prelude/util/types'

import { identity } from '@principia/prelude/function'
import { tuple } from '@principia/prelude/tuple'

import { parallel, sequential } from '../../ExecutionStrategy'
import * as R from '../../Record'
import { map_, mapM_ } from '../core'
import * as I from '../internal/io'
import { foreachPar_ } from './foreachPar'
import { foreachParN_ } from './foreachParN'
import { makeManagedReleaseMap } from './makeManagedReleaseMap'

/*
 * -------------------------------------------
 * Parallel Apply Managed
 * -------------------------------------------
 */

/**
 * Returns a managed that executes both this managed and the specified managed,
 * in parallel, combining their results with the specified `f` function.
 */
export function crossWithPar_<R, E, A, R1, E1, B, C>(
  fa: Managed<R, E, A>,
  fb: Managed<R1, E1, B>,
  f: (a: A, b: B) => C
): Managed<R & R1, E | E1, C> {
  return mapM_(makeManagedReleaseMap(parallel), (parallelReleaseMap) => {
    const innerMap = I.gives_(makeManagedReleaseMap(sequential).io, (r: R & R1) => tuple(r, parallelReleaseMap))

    return I.bind_(I.cross_(innerMap, innerMap), ([[_, l], [__, r]]) =>
      I.crossWithPar_(
        I.gives_(fa.io, (_: R & R1) => tuple(_, l)),
        I.gives_(fb.io, (_: R & R1) => tuple(_, r)),
        ([_, a], [__, a2]) => f(a, a2)
      )
    )
  })
}

/**
 * Returns a managed that executes both this managed and the specified managed,
 * in parallel, combining their results with the specified `f` function.
 */
export function crossWithPar<A, R1, E1, B, C>(
  fb: Managed<R1, E1, B>,
  f: (a: A, b: B) => C
): <R, E>(fa: Managed<R, E, A>) => Managed<R & R1, E1 | E, C> {
  return (fa) => crossWithPar_(fa, fb, f)
}

export function crossPar_<R, E, A, R1, E1, B>(
  fa: Managed<R, E, A>,
  fb: Managed<R1, E1, B>
): Managed<R & R1, E | E1, readonly [A, B]> {
  return crossWithPar_(fa, fb, tuple)
}

export function crossPar<R1, E1, B>(
  fb: Managed<R1, E1, B>
): <R, E, A>(fa: Managed<R, E, A>) => Managed<R & R1, E | E1, readonly [A, B]> {
  return (fa) => crossPar_(fa, fb)
}

export function apPar_<R, E, A, R1, E1, B>(
  fab: Managed<R1, E1, (a: A) => B>,
  fa: Managed<R, E, A>
): Managed<R & R1, E | E1, B> {
  return crossWithPar_(fab, fa, (f, a) => f(a))
}

export function apPar<R, E, A>(
  fa: Managed<R, E, A>
): <R1, E1, B>(fab: Managed<R1, E1, (a: A) => B>) => Managed<R & R1, E | E1, B> {
  return (fab) => apPar_(fab, fa)
}

export function aplPar_<R, E, A, R1, E1, B>(fa: Managed<R, E, A>, fb: Managed<R1, E1, B>): Managed<R & R1, E | E1, A> {
  return crossWithPar_(fa, fb, (a, _) => a)
}

export function aplPar<R1, E1, B>(
  fb: Managed<R1, E1, B>
): <R, E, A>(fa: Managed<R, E, A>) => Managed<R & R1, E1 | E, A> {
  return (fa) => aplPar_(fa, fb)
}

export function aprPar_<R, E, A, R1, E1, B>(fa: Managed<R, E, A>, fb: Managed<R1, E1, B>): Managed<R & R1, E | E1, B> {
  return crossWithPar_(fa, fb, (_, b) => b)
}

export function aprPar<R1, E1, B>(
  fb: Managed<R1, E1, B>
): <R, E, A>(fa: Managed<R, E, A>) => Managed<R & R1, E1 | E, B> {
  return (fa) => aprPar_(fa, fb)
}

export function sequenceSPar<MR extends ReadonlyRecord<string, Managed<any, any, any>>>(
  mr: EnforceNonEmptyRecord<MR> & ReadonlyRecord<string, Managed<any, any, any>>
): Managed<
  _R<MR[keyof MR]>,
  _E<MR[keyof MR]>,
  {
    [K in keyof MR]: [MR[K]] extends [Managed<any, any, infer A>] ? A : never
  }
> {
  return map_(
    foreachPar_(
      R.collect_(mr, (k, v) => [k, v] as const),
      ([k, v]) => map_(v, (a) => [k, a] as const)
    ),
    (kvs) => {
      const mut_r = {}
      for (let i = 0; i < kvs.length; i++) {
        const [k, v] = kvs[i]
        mut_r[k]     = v
      }
      return mut_r
    }
  ) as any
}

export function sequenceSParN(n: number) {
  return <MR extends ReadonlyRecord<string, Managed<any, any, any>>>(
    mr: EnforceNonEmptyRecord<MR> & ReadonlyRecord<string, Managed<any, any, any>>
  ): Managed<
    _R<MR[keyof MR]>,
    _E<MR[keyof MR]>,
    {
      [K in keyof MR]: [MR[K]] extends [Managed<any, any, infer A>] ? A : never
    }
  > =>
    map_(
      foreachParN_(
        R.collect_(mr, (k, v) => [k, v] as const),
        n,
        ([k, v]) => map_(v, (a) => [k, a] as const)
      ),
      (kvs) => {
        const mut_r = {}
        for (let i = 0; i < kvs.length; i++) {
          const [k, v] = kvs[i]
          mut_r[k]     = v
        }
        return mut_r
      }
    ) as any
}

export function sequenceTPar<T extends ReadonlyArray<Managed<any, any, any>>>(
  ...t: T & {
    0: Managed<any, any, any>
  }
): Managed<
  _R<T[number]>,
  _E<T[number]>,
  {
    [K in keyof T]: [T[K]] extends [Managed<any, any, infer A>] ? A : never
  }
> {
  return foreachPar_(t, identity) as any
}

export function sequenceTParN(n: number) {
  return <T extends ReadonlyArray<Managed<any, any, any>>>(
    ...t: T & {
      0: Managed<any, any, any>
    }
  ): Managed<
    _R<T[number]>,
    _E<T[number]>,
    {
      [K in keyof T]: [T[K]] extends [Managed<any, any, infer A>] ? A : never
    }
  > => foreachParN_(t, n, identity) as any
}
