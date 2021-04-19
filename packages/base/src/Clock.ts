/**
 * Ported from https://github.com/zio/zio/blob/master/core/shared/src/main/scala/zio/Clock.scala
 *
 * Copyright 2020 Michael Arnaldi and the Matechs Garage Contributors.
 */
import { tag } from '@principia/prelude/Has'

import { effectAsyncInterrupt } from './IO/combinators/interrupt'
import * as I from './IO/core'
import * as L from './Layer/core'

/**
 * Clock Model
 */

export const ClockTag = tag<Clock>()

/**
 * Live clock implementation
 */
export class LiveClock implements Clock {
  currentTime: I.UIO<number> = I.effectTotal(() => new Date().getTime())

  sleep = (ms: number): I.UIO<void> =>
    effectAsyncInterrupt((cb) => {
      const timeout = setTimeout(() => {
        cb(I.unit())
      }, ms)

      return I.effectTotal(() => {
        clearTimeout(timeout)
      })
    })
}

export abstract class Clock {
  abstract readonly currentTime: I.UIO<number>
  abstract readonly sleep: (ms: number) => I.UIO<void>

  static currentTime = I.asksServiceM(ClockTag)((_) => _.currentTime)
  static sleep       = (ms: number) => I.asksServiceM(ClockTag)((_) => _.sleep(ms))

  static live = L.succeed(ClockTag)(new LiveClock())
}

/**
 * Proxy Clock Implementation
 */
export class ProxyClock implements Clock {
  constructor(readonly currentTime: I.UIO<number>, readonly sleep: (ms: number) => I.UIO<void>) {}
}
