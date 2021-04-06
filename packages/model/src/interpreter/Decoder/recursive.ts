import type * as Alg from '../../algebra'
import type { DecoderURI } from './HKT'

import { pipe } from '@principia/base/function'
import * as D from '@principia/codec/Decoder'

import { implementInterpreter } from '../../HKT'
import { memoize } from '../../utils'
import { applyDecoderConfig } from './HKT'
import { withConfig } from './utils'

export const RecursiveDecoder = implementInterpreter<DecoderURI, Alg.RecursiveURI>()((_) => ({
  recursive: (id, f, config) => {
    const get = memoize<void, ReturnType<typeof f>>(() => f(res))

    const res: ReturnType<typeof f> = (env) =>
      pipe(
        () => get()(env),
        (getDecoder) => applyDecoderConfig(config?.config)(withConfig(config)(D.lazy(id, getDecoder)), env, {})
      )

    return res
  }
}))
