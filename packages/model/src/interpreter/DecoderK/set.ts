import type * as Alg from '../../algebra'
import type { DecoderKURI } from './HKT'

import * as A from '@principia/base/Array'
import { flow, pipe } from '@principia/base/Function'
import * as S from '@principia/base/Set'
import { error } from '@principia/codec/DecodeErrors'
import * as D from '@principia/codec/DecoderK'
import * as FS from '@principia/free/FreeSemigroup'

import { implementInterpreter } from '../../HKT'
import { applyDecoderConfig } from './HKT'
import { extractInfo } from './utils'

export const SetDecoder = implementInterpreter<DecoderKURI, Alg.SetURI>()((_) => ({
  set: (a, O, config) => (env) =>
    pipe(a(env), (decoder) =>
      applyDecoderConfig(config?.config)(
        pipe(
          D.UnknownArray(),
          D.mapLeftWithInput((i, e) => FS.Combine(e, error(i, 'Set', extractInfo(config)))),
          D.parse((M) => flow(A.traverse(M)((a) => decoder.decode(M)(a)))),
          D.map(S.fromArray(O))
        ),
        env,
        decoder
      )
    )
}))
