import type * as Alg from '../../algebra'
import type { URI } from './HKT'

import { pipe } from '@principia/base/data/Function'
import * as D from '@principia/codec/Decoder'

import { implementInterpreter } from '../../HKT'
import { memoize } from '../../utils'
import { applyDecoderConfig } from './HKT'
import { extractInfo } from './utils'

export const RecursiveDecoder = implementInterpreter<URI, Alg.RecursiveURI>()((_) => ({
  recursive: (id, f, config) => {
    const get = memoize<void, ReturnType<typeof f>>(() => f(res))
    const res: ReturnType<typeof f> = (env) =>
      pipe(
        (M: any) => () => get()(env)(M),
        (getDecoder) =>
          applyDecoderConfig(config?.config)((M) => D.lazy(M)(id, getDecoder(M), extractInfo(config)), env, {})
      )

    return res
  }
}))
