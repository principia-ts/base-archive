import type * as Alg from '../../algebra'
import type { URI } from './HKT'

import * as E from '@principia/base/data/Either'
import { pipe } from '@principia/base/data/Function'
import * as O from '@principia/base/data/Option'
import * as DE from '@principia/codec/DecodeError'
import { error } from '@principia/codec/DecodeErrors'
import * as D from '@principia/codec/Decoder'
import * as FS from '@principia/free/FreeSemigroup'

import { implementInterpreter } from '../../HKT'
import { applyDecoderConfig } from './HKT'
import { extractInfo } from './utils'

export const NewtypeDecoder = implementInterpreter<URI, Alg.NewtypeURI>()((_) => ({
  newtypeIso: (iso, a, config) => (env) =>
    pipe(a(env), (decoder) =>
      applyDecoderConfig(config?.config)(
        (M) =>
          pipe(
            decoder(M),
            D.map(M)(iso.get),
            D.mapLeftWithInput(M)((i, e) => FS.combine(e, FS.element(DE.info(extractInfo(config)))))
          ),
        env,
        decoder
      )
    ),
  newtypePrism: (prism, a, config) => (env) =>
    pipe(a(env), (decoder) =>
      applyDecoderConfig(config?.config)(
        (M) =>
          pipe(
            decoder(M),
            D.parse(M)((a) =>
              O.fold_(
                prism.getOption(a),
                () =>
                  M.fail(
                    error(a, '', {
                      message: 'newtype does not satisfy prism conditions',
                      ...extractInfo(config)
                    })
                  ),
                (n) => M.pure(n)
              )
            )
          ),
        env,
        decoder
      )
    )
}))
