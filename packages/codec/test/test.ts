import * as S from '@principia/io/Sync'
import { Suite } from 'benchmark'
import { inspect } from 'util'

import * as D from '../src/Decoder'

new Suite('decoder')
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
