import type * as Alg from '../../algebra'
import type { URI } from './HKT'

import { pipe } from '@principia/base/Function'
import * as D from '@principia/codec/DecoderKF'

import { implementInterpreter } from '../../HKT'
import { memoize } from '../../utils'
import { applyDecoderConfig } from './HKT'
import { extractInfo } from './utils'

export const RecursiveDecoder = implementInterpreter<URI, Alg.RecursiveURI>()((_) => ({
  recursive: (id, f, config) => {
    const get = memoize<void, ReturnType<typeof f>>(() => f(res))

    const res: ReturnType<typeof f> = (env) =>
      pipe(
        () => get()(env),
        (getDecoder) => applyDecoderConfig(config?.config)(D.lazy(id, getDecoder, extractInfo(config)), env, {})
      )

    return res
  }
}))
