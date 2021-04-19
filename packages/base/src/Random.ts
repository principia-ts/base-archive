/**
 * Ported from https://github.com/zio/zio/blob/master/core/shared/src/main/scala/zio/Random.scala
 *
 * Copyright 2020 Michael Arnaldi and the Matechs Garage Contributors.
 */
import { tag } from '@principia/prelude/Has'

import * as I from './IO/core'
import * as L from './Layer/core'

/*
 * -------------------------------------------
 * Internal
 * -------------------------------------------
 */

// A port of an algorithm by Johannes Baagøe <baagoe@baagoe.com>, 2010
// http://baagoe.com/en/RandomMusings/javascript/
// https://github.com/nquinlan/better-random-numbers-for-javascript-mirror

export interface AleaState {
  s0: number
  s1: number
  s2: number
  c: number
}

export function Mash() {
  let n = 0xefc8249d

  const mash = function (data: string) {
    for (let i = 0; i < data.length; i++) {
      n    += data.charCodeAt(i)
      let h = 0.02519603282416938 * n
      n     = h >>> 0
      h    -= n
      h    *= n
      n     = h >>> 0
      h    -= n
      n    += h * 0x100000000 // 2^32
    }
    return (n >>> 0) * 2.3283064365386963e-10 // 2^-32
  }

  return mash
}

/* eslint-disable functional/immutable-data */
export class Alea {
  private mash: (data: string) => number = undefined as any
  public s0: number                      = undefined as any
  public s1: number                      = undefined as any
  public s2: number                      = undefined as any
  public c: number                       = undefined as any

  constructor(seed: string) {
    this.setSeed(seed)
  }

  setSeed(seed: string) {
    this.mash = Mash()

    this.s0 = this.mash(' ')
    this.s1 = this.mash(' ')
    this.s2 = this.mash(' ')
    this.c  = 1

    this.s0 -= this.mash(seed)

    if (this.s0 < 0) {
      this.s0 += 1
    }

    this.s1 -= this.mash(seed)

    if (this.s1 < 0) {
      this.s1 += 1
    }

    this.s2 -= this.mash(seed)

    if (this.s2 < 0) {
      this.s2 += 1
    }
  }

  next() {
    const t = 2091639 * this.s0 + this.c * 2.3283064365386963e-10 // 2^-32
    this.s0 = this.s1
    this.s1 = this.s2
    return (this.s2 = t - (this.c = t | 0))
  }
}
/* eslint-enable functional/immutable-data */

export class PRNG {
  readonly xg: Alea

  constructor(seed: string) {
    this.xg = new Alea(seed)
  }

  setSeed(seed: string) {
    this.xg.setSeed(seed)
  }

  next() {
    return this.xg.next()
  }

  int32() {
    return (this.xg.next() * 0x100000000) | 0
  }

  double() {
    return this.next() + ((this.next() * 0x200000) | 0) * 1.1102230246251565e-16
  }
}

/*
 * -------------------------------------------
 * Model
 * -------------------------------------------
 */
export class LiveRandom implements Random {
  private PRNG = new PRNG(this.seed)

  constructor(private seed: string) {}

  next: I.UIO<number> = I.effectTotal(() => this.PRNG.next())

  nextBoolean: I.UIO<boolean> = I.bind_(this.next, (n) => I.effectTotal(() => n > 0.5))

  nextInt: I.UIO<number> = I.effectTotal(() => this.PRNG.int32())

  nextDouble: I.UIO<number> = I.effectTotal(() => this.PRNG.double())

  nextRange: (low: number, high: number) => I.UIO<number> = (low, high) =>
    I.bind_(this.next, (n) => I.effectTotal(() => (high - low) * n + low))

  nextIntBetween: (low: number, high: number) => I.UIO<number> = (low, high) =>
    I.bind_(this.next, (n) => I.effectTotal(() => Math.floor((high - low + 1) * n + low)))

  setSeed = (s: string) =>
    I.effectTotal(() => {
      this.PRNG.setSeed(s)
    })
}

export const defaultRandom = new LiveRandom(String(Math.random()))

export const RandomTag = tag<Random>()

export abstract class Random {
  abstract readonly next: I.UIO<number>
  abstract readonly nextBoolean: I.UIO<boolean>
  abstract readonly nextInt: I.UIO<number>
  abstract readonly nextDouble: I.UIO<number>
  abstract readonly nextRange: (low: number, high: number) => I.UIO<number>
  abstract readonly nextIntBetween: (low: number, high: number) => I.UIO<number>
  abstract readonly setSeed: (s: string) => I.UIO<void>

  static live = L.succeed(RandomTag)(defaultRandom)

  static next           = I.deriveLifted(RandomTag)([], ['next'], []).next
  static nextBoolean    = I.deriveLifted(RandomTag)([], ['nextBoolean'], []).nextBoolean
  static nextIntBetween = I.deriveLifted(RandomTag)(['nextIntBetween'], [], []).nextIntBetween
  static nextInt        = I.deriveLifted(RandomTag)([], ['nextInt'], []).nextInt
  static nextDouble     = I.deriveLifted(RandomTag)([], ['nextDouble'], []).nextDouble
  static nextRange      = I.deriveLifted(RandomTag)(['nextRange'], [], []).nextRange
  static setSeed        = I.deriveLifted(RandomTag)(['setSeed'], [], []).setSeed
}

export function withSeed(seed: string) {
  return I.updateService(RandomTag, () => new LiveRandom(seed))
}
