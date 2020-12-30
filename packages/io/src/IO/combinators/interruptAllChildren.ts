import type { IO } from '../core'

import { interruptAll } from '../../Fiber'
import { ensuringChildren_ } from './ensuringChildren'

export const interruptAllChildren = <R, E, A>(io: IO<R, E, A>) => ensuringChildren_(io, interruptAll)
