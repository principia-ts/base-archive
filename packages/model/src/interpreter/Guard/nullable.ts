import type * as Alg from '../../algebra'
import type { GuardURI } from './HKT'
import type { Option } from '@principia/base/Option'

import { pipe } from '@principia/base/function'
import * as G from '@principia/base/Guard'

import { implementInterpreter } from '../../HKT'
import { applyGuardConfig } from './HKT'

export const NullableGuard = implementInterpreter<GuardURI, Alg.NullableURI>()((_) => ({
  nullable: (a, config) => (env) =>
    pipe(a(env), (guard) => applyGuardConfig(config?.config)(G.nullable(guard), env, guard)),
  optional: (a, config) => (env) =>
    pipe(a(env), (guard) =>
      applyGuardConfig(config?.config)(
        {
          is: (u): u is Option<G.TypeOf<typeof guard>> =>
            typeof u === 'object' &&
            u !== null &&
            ['None', 'Some'].indexOf(u['_tag']) !== -1 &&
            ((u['_tag'] === 'Some' && guard.is(u['value'])) || u['_tag'] === 'None')
        },
        env,
        guard
      )
    )
}))
