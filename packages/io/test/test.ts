import { pipe } from '@principia/base/function'

import * as I from '../src/IO'
import * as Ref from '../src/Ref'

const x = pipe(Ref.makeRefM(0), I.map(Ref.map((n) => n.toString())))

const y = pipe(Ref.makeRef(0), I.map(Ref.map((n) => n.toString())))
