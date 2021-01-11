/**
 * Ported from https://github.com/zio/zio/blob/master/core/shared/src/main/scala/zio/Clock.scala
 *
 * Copyright 2020 Michael Arnaldi and the Matechs Garage Contributors.
 */
import type { HasTag } from '@principia/base/Has'

import { tag } from '@principia/base/Has'

import { effectAsyncInterrupt } from './IO/combinators/interrupt'
import * as I from './IO/core'

/**
 * Clock Model
 */

export interface Clock {
  readonly currentTime: I.UIO<number>
  readonly sleep: (ms: number) => I.UIO<void>
}

/**
 * Has Clock
 */
export const Clock = tag<Clock>()

export type HasClock = HasTag<typeof Clock>

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

/**
 * Proxy Clock Implementation
 */
export class ProxyClock implements Clock {
  constructor(readonly currentTime: I.UIO<number>, readonly sleep: (ms: number) => I.UIO<void>) {}
}

/**
 * Get the current time in ms since epoch
 */
export const currentTime = I.asksServiceM(Clock)((_) => _.currentTime)

/**
 * Sleeps for the provided amount of ms
 */
export const sleep = (ms: number) => I.asksServiceM(Clock)((_) => _.sleep(ms))

/**
 * Access clock from environment
 */
export const withClockM = I.asksServiceM(Clock)

/**
 * Access clock from environment
 */
export const withClock = I.asksService(Clock)
