import '@principia/base/unsafe/Operators'

import { tuple } from '@principia/base/data/Function'
import * as Iter from '@principia/base/data/Iterable'
import * as Str from '@principia/base/data/String'
import { inspect } from 'util'

import * as C from '../src/Console'
import * as I from '../src/IO'
import * as S from '../src/Stream'
import * as Sink from '../src/Stream/Sink'

S.fromChunk(['hello', 'world', 'hi', 'holla'])
  ['|>'](S.groupByKey((str) => str[0]))
  ['|>'](S.GroupBy.merge((k, s) => s['|>'](S.take(2))['|>'](S.map((s) => tuple(k, s)))))
  ['|>'](S.runCollect)
  ['|>']((x) => I.run(x, (ex) => console.log(inspect(ex, { colors: true, depth: 4 }))))
