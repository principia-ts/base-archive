import '@principia/base/unsafe/Operators'

import { tuple } from '@principia/base/data/Function'
import * as Iter from '@principia/base/data/Iterable'
import * as Str from '@principia/base/data/String'
import { inspect } from 'util'

import * as C from '../src/Console'
import * as I from '../src/IO'
import * as S from '../src/Stream'
import * as Sink from '../src/Stream/Sink'

const effects = [
  I.async<unknown, never, string>((k) => {
    setTimeout(() => {
      k(I.succeed('Hello'))
    }, 1000)
  }),
  I.async<unknown, never, string>((k) => {
    setTimeout(() => {
      k(I.succeed('world'))
    }, 2000)
  }),
  I.async<unknown, never, string>((k) => {
    setTimeout(() => {
      k(I.succeed('!'))
    }, 3000)
  })
]

effects['|>'](I.collectAllPar)
  ['|>'](I.flatMap((xs) => C.putStrLn(xs.join(''))))
  ['|>'](I.timed)
  ['|>'](I.giveLayer(C.NodeConsole.live))
  ['|>']((x) => I.run(x, (ex) => console.log(ex)))
