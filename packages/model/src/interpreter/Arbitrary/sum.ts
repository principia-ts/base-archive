import type * as Alg from '../../algebra'
import type { ArbitraryURI } from './HKT'
import type { Arbitrary } from 'fast-check'

import * as E from '@principia/base/Either'
import { pipe } from '@principia/base/function'
import * as O from '@principia/base/Option'
import * as R from '@principia/base/Record'

import { implementInterpreter } from '../../HKT'
import { accessFastCheck, applyArbitraryConfig } from './HKT'

export const SumArbitrary = implementInterpreter<ArbitraryURI, Alg.SumURI>()((_) => ({
  taggedUnion: (tag, types, config) => (env) =>
    pipe(
      types as Record<string, (_: typeof env) => Arbitrary<any>>,
      R.collect((_, getArb) => getArb(env)),
      (arbs) => applyArbitraryConfig(config?.config)(accessFastCheck(env).oneof(...arbs) as any, env, arbs as any)
    ),
  either: (left, right, config) => (env) =>
    pipe(left(env), (l) =>
      pipe(right(env), (r) =>
        applyArbitraryConfig(config?.config)(accessFastCheck(env).oneof(l.map(E.Left), r.map(E.Right)), env, {
          left: l,
          right: r
        })
      )
    ),
  option: (a, config) => (env) =>
    pipe(a(env), (arb) =>
      applyArbitraryConfig(config?.config)(
        accessFastCheck(env).oneof(arb.map(O.Some), accessFastCheck(env).constant(O.None)) as any,
        env,
        arb
      )
    )
}))
