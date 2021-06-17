import { pipe } from '@principia/base/function'

import { tag } from '../src/Has'
import * as I from '../src/IO'
import { debug } from '../src/IOAspect'

interface ServiceX {
  readonly x: number
}
const xTag = tag<ServiceX>()

interface ServiceY {
  readonly y: number
}
const yTag = tag<ServiceY>()

I.run_(
  pipe(
    I.askServicesT(xTag, yTag),
    I.map(([x, y]) => x.x + y.y),
    I.giveServicesT(xTag, yTag)({ x: 1 }, { y: 2 })
  )['@@'](debug)
)
