import '@principia/base/unsafe/Operators'

import * as C from '../src/Chunk'
import * as SIO from '../src/Multi'

console.log(
  SIO.pure('A')
    ['|>'](SIO.tap((x) => SIO.tell(x.length + 1)))
    ['|>'](SIO.listens(C.map((n) => n + 1)))
    ['|>'](SIO.runResult)
)
