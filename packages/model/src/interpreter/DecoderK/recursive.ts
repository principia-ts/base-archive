import type * as Alg from '../../algebra'
import type { DecoderKURI } from './HKT'

import { pipe } from '@principia/base/function'
import * as D from '@principia/codec/DecoderK'

import { implementInterpreter } from '../../HKT'
import { memoize } from '../../utils'
import { applyDecoderConfig } from './HKT'
import { extractInfo } from './utils'

export const RecursiveDecoder = implementInterpreter<DecoderKURI, Alg.RecursiveURI>()((_) => ({
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
