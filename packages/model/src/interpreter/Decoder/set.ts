import type * as Alg from '../../algebra'
import type { DecoderURI } from './HKT'

import * as A from '@principia/base/Array'
import { flow, pipe } from '@principia/base/function'
import * as Set from '@principia/base/Set'
import * as D from '@principia/codec/Decoder'
import * as FS from '@principia/base/FreeSemigroup'
import * as S from '@principia/base/Sync'

import { implementInterpreter } from '../../HKT'
import { applyDecoderConfig } from './HKT'
import { withConfig } from './utils'

export const SetDecoder = implementInterpreter<DecoderURI, Alg.SetURI>()((_) => ({
  set: (a, O, config) => (env) =>
    pipe(a(env), (decoder) =>
      applyDecoderConfig(config?.config)(
        pipe(D.array(decoder), D.parse(flow(Set.fromArray(O), S.succeed)), withConfig(config)),
        env,
        decoder
      )
    )
}))
