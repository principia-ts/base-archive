import type * as Alg from '../../algebra'
import type { EncoderURI } from './HKT'

import { pipe } from '@principia/base/Function'
import * as E from '@principia/codec/Encoder'

import { implementInterpreter } from '../../HKT'
import { memoize } from '../../utils'
import { applyEncoderConfig } from './HKT'

export const RecursiveEncoder = implementInterpreter<EncoderURI, Alg.RecursiveURI>()((_) => ({
  recursive: (id, a, config) => {
    const get                       = memoize<void, ReturnType<typeof a>>(() => a(res))
    const res: ReturnType<typeof a> = (env) =>
      pipe(
        () => get()(env),
        (getEncoder) => applyEncoderConfig(config?.config)(E.lazy(getEncoder), env, {})
      )
    return res
  }
}))
