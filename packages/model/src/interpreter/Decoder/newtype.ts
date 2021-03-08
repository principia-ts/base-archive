import type * as Alg from '../../algebra'
import type { DecoderURI } from './HKT'

import { pipe } from '@principia/base/Function'
import * as O from '@principia/base/Option'
import * as DE from '@principia/codec/DecodeError'
import { error } from '@principia/codec/DecodeErrors'
import * as D from '@principia/codec/DecoderKF'
import * as FS from '@principia/free/FreeSemigroup'

import { implementInterpreter } from '../../HKT'
import { applyDecoderConfig } from './HKT'
import { extractInfo } from './utils'

export const NewtypeDecoder = implementInterpreter<DecoderURI, Alg.NewtypeURI>()((_) => ({
  newtypeIso: (iso, a, config) => (env) =>
    pipe(a(env), (decoder) =>
      applyDecoderConfig(config?.config)(
        pipe(
          decoder,
          D.map(iso.get),
          D.mapLeftWithInput((i, e) => FS.Combine(e, FS.Element(DE.Info(extractInfo(config)))))
        ),
        env,
        decoder
      )
    ),
  newtypePrism: (prism, a, config) => (env) =>
    pipe(a(env), (decoder) =>
      applyDecoderConfig(config?.config)(
        pipe(
          decoder,
          D.parse((M) => (a) =>
            O.match_(
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
