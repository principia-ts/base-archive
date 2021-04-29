import type { Has } from './Has'

import { Clock } from './Clock'
import { Console } from './Console'
import * as L from './Layer'
import { Random } from './Random'

export type IOEnv = Has<Clock> & Has<Random> & Has<Console>

export const live = L.allPar(Clock.live, Random.live, Console.live)
