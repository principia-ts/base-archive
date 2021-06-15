import * as C from '../src/Chunk'
import { Console } from '../src/Console'
import * as S from '../src/experimental/Stream'
import { flow, pipe } from '../src/function'
import * as I from '../src/IO'

const s1 = S.fromChunk(C.range(0, 10))
const s2 = (n: number) => S.fromEffect(I.delay(100)(I.succeed(n * 2)))

pipe(
  s1,
  S.bindPar(s2, 10),
  S.runCollect,
  I.tap(flow(C.toArray, Console.put)),
  I.timed,
  I.tap(([time]) => Console.put(time)),
  I.run((ex) => console.log(ex))
)
