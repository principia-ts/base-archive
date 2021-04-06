import * as E from '@principia/base/Either'
import { pipe } from '@principia/base/Function'
import * as DK from '@principia/codec/DecoderK'
import { Validation } from '@principia/codec/SyncDecoder'
import * as S from '@principia/io/Sync'
import { Suite } from 'benchmark'
import { inspect } from 'util'

import * as D from '../src/Decoder'

new Suite('decoder')
  .add('DecoderK: struct', () => {
    const d = DK.struct({
      a: DK.string(),
      b: DK.number(),
      c: DK.struct({
        d: DK.boolean(),
        e: DK.literal('hello')()
      })
    })
    S.runEither(
      d.decode(Validation)({
        a: 'string',
        b: 99,
        c: {
          d: true,
          e: 'hello'
        }
      })
    )
  })
  .add('Decoder: struct', () => {
    const d = D.struct({
      a: D.string,
      b: D.number,
      c: D.struct({
        d: D.boolean,
        e: D.literal('hello')
      })
    })
    S.runEither(
      d.decode({
        a: 'string',
        b: 99,
        c: {
          d: true,
          e: 'hello'
        }
      })
    )
  })
  .on('cycle', (event: any) => {
    console.log(String(event.target))
  })
  .run()
