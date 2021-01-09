import type { Layer } from './Layer'
import type { Has } from '@principia/base/Has'
import type { InspectOptions } from 'util'

import { pipe } from '@principia/base/Function'
import { tag } from '@principia/base/Has'
import { inspect } from 'util'

import * as I from './IO'
import * as L from './Layer'

export interface Console {
  readonly putStrLn: (line: string) => I.UIO<void>
  readonly putStrLnErr: (line: string) => I.UIO<void>
  readonly putStrLnDebug: (line: string) => I.UIO<void>
}

export const Console = tag<Console>()

export const { putStrLn, putStrLnDebug, putStrLnErr } = I.deriveLifted(Console)(
  ['putStrLn', 'putStrLnErr', 'putStrLnDebug'],
  [],
  []
)

export class NodeConsole implements Console {
  putStrLn(...data: any[]) {
    return I.effectTotal(() => {
      console.log(...data)
    })
  }
  putStrLnErr(...data: any[]) {
    return I.effectTotal(() => {
      console.error(...data)
    })
  }
  putStrLnDebug(...data: any[]) {
    return I.effectTotal(() => {
      console.debug(...data)
    })
  }

  time(label?: string) {
    return I.effectTotal(() => {
      console.time(label)
    })
  }
  timeEnd(label?: string) {
    return I.effectTotal(() => {
      console.timeEnd(label)
    })
  }
  timeLog(label?: string) {
    return I.effectTotal(() => {
      console.timeLog(label)
    })
  }

  count(label?: string) {
    return I.effectTotal(() => {
      console.count(label)
    })
  }
  countReset(label?: string) {
    return I.effectTotal(() => {
      console.countReset(label)
    })
  }

  inspect(object: any, options?: InspectOptions) {
    return I.effectTotal(() => {
      console.log(inspect(object, options ?? {}))
    })
  }

  static live: Layer<unknown, never, Has<Console>> = L.pure(Console)(new NodeConsole())
}
