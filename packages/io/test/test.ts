import '@principia/base/unsafe/Operators'

import { inspect } from 'util'

import * as C from '../src/Console'
import * as I from '../src/IO'
import * as Stream from '../src/Stream'
import * as Sink from '../src/Stream/Sink'

const s1 = Stream.iterate(0, (n) => n + 1)['|>'](Stream.take(100))
const s2 = Stream.iterate(1, (n) => n * 2)['|>'](Stream.take(100))

s1['|>'](Stream.concat(s2))
  ['|>'](Stream.foreach((n) => C.putStrLn(`${n}`)))
  ['|>'](I.giveLayer(C.NodeConsole.live))
  ['|>'](I.run)
