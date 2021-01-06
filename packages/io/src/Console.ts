import type { Layer } from './Layer'
import type { Has } from '@principia/base/data/Has'
import type { InspectOptions } from 'util'

import { pipe } from '@principia/base/data/Function'
import { tag } from '@principia/base/data/Has'
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
    return I.total(() => {
      console.log(...data)
    })
  }
  putStrLnErr(...data: any[]) {
    return I.total(() => {
      console.error(...data)
    })
  }
  putStrLnDebug(...data: any[]) {
    return I.total(() => {
      console.debug(...data)
    })
  }

  time(label?: string) {
    return I.total(() => {
      console.time(label)
    })
  }
  timeEnd(label?: string) {
    return I.total(() => {
      console.timeEnd(label)
    })
  }
  timeLog(label?: string) {
    return I.total(() => {
      console.timeLog(label)
    })
  }

  count(label?: string) {
    return I.total(() => {
      console.count(label)
    })
  }
  countReset(label?: string) {
    return I.total(() => {
      console.countReset(label)
    })
  }

  inspect(object: any, options?: InspectOptions) {
    return I.total(() => {
      console.log(inspect(object, options ?? {}))
    })
  }

  static live: Layer<unknown, never, Has<Console>> = L.pure(Console)(new NodeConsole())
}
