import type * as Alg from '../../algebra'
import type { DecoderURI } from './HKT'

import { flow, pipe } from '@principia/base/function'
import * as O from '@principia/base/Option'
import * as D from '@principia/codec/Decoder'
import * as S from '@principia/base/Sync'

import { NewtypePrismE } from '../../algebra'
import { implementInterpreter } from '../../HKT'
import { applyDecoderConfig } from './HKT'
import { withConfig } from './utils'

export const NewtypeDecoder = implementInterpreter<DecoderURI, Alg.NewtypeURI>()((_) => ({
  newtypeIso: (iso, a, config) => (env) =>
    pipe(a(env), (decoder) =>
      applyDecoderConfig(config?.config)(
        pipe(decoder, D.parse(flow(iso.get, S.succeed)), withConfig(config)),
        env,
        decoder
      )
    ),
  newtypePrism: (prism, a, config) => (env) =>
    pipe(a(env), (decoder) =>
      applyDecoderConfig(config?.config)(
        pipe(
          decoder,
          D.parse((a) => O.match_(prism.getOption(a), () => S.fail(new NewtypePrismE(a)), S.succeed)),
          withConfig(config)
        ),
        env,
        decoder
      )
    )
}))
