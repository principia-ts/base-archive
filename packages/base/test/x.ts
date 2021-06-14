import * as C from '../src/Chunk'
import { Console } from '../src/Console'
import * as S from '../src/experimental/Stream'
import { flow, pipe } from '../src/function'
import * as I from '../src/IO'

pipe(
  S.fromChunk(C.range(0, 100)),
  S.mapM((n) => I.delay_(I.succeed(n + 1), 100)),
  S.runCollect,
  I.tap(flow(C.toArray, Console.put)),
  I.timed,
  I.tap(([time]) => Console.put(time)),
  I.run((ex) => console.log(ex))
)
