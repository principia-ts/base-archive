import { pipe } from '@principia/base/function'

import { tag } from '../src/Has'
import * as I from '../src/IO'

const t1 = tag<{ x: number }>()
const t2 = tag<{ y: string }>()

pipe(
  I._giveServicesTIO(
    [t1, I.succeed({ x: 0 })],
    [t2, I.succeed({ y: 'hello' })]
  )(I.asksServicesT(t1, t2)(({ x }, { y }) => x + y)),
  I.chain((s) => I.succeedWith(() => console.log(s))),
  I.run()
)
