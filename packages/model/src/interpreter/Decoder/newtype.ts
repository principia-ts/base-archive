import type * as Alg from '../../algebra'
import type { NewtypePrismE } from '../../algebra'
import type { DecoderURI } from './HKT'

import { pipe } from '@principia/base/function'
import * as O from '@principia/base/Option'
import * as Th from '@principia/base/These'
import * as DE from '@principia/codec/DecodeError'
import * as D from '@principia/codec/Decoder'

import { implementInterpreter } from '../../HKT'
import { applyDecoderConfig } from './HKT'
import { withConfig } from './utils'

export const NewtypeDecoder = implementInterpreter<DecoderURI, Alg.NewtypeURI>()((_) => ({
  newtypeIso: (iso, a, config) => (env) =>
    pipe(a(env), (decoder) =>
      applyDecoderConfig(config?.config)(
        pipe(decoder, D.map(iso.get), withConfig(config)),
        env,
        decoder
      )
    ),
  newtypePrism: (prism, a, config) => (env) =>
    pipe(a(env), (decoder) =>
      applyDecoderConfig(config?.config)(
        pipe(
          decoder,
          D.parse((a) =>
            O.match_(
              prism.getOption(a),
              () =>
                Th.Left(
                  DE.leafE<NewtypePrismE>({ _tag: 'NewtypePrismE', actual: a })
                ),
              Th.Right
            ),
            config?.label ?? `Newtype(${decoder.label})`
          ),
          withConfig(config)
        ),
        env,
        decoder
      )
    )
}))
