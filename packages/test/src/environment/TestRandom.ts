import type { Has } from '@principia/base/Has'
import type { List } from '@principia/base/List'
import type { Option } from '@principia/base/Option'
import type { Chunk } from '@principia/io/Chunk'
import type { Clock } from '@principia/io/Clock'
import type { UIO } from '@principia/io/IO'
import type { URef } from '@principia/io/IORef'
import type { Random } from '@principia/io/Random'

import { Byte } from '@principia/base/Byte'
import { IllegalArgumentError } from '@principia/base/Error'
import { tag } from '@principia/base/Has'
import * as Li from '@principia/base/List'
import * as O from '@principia/base/Option'
import { ImmutableQueue } from '@principia/base/util/support/ImmutableQueue'
import { ClockTag } from '@principia/io/Clock'
import * as I from '@principia/io/IO'
import * as Ref from '@principia/io/IORef'
import * as L from '@principia/io/Layer'
import { Mash, RandomTag } from '@principia/io/Random'
import { intersect } from '@principia/io/util/intersect'

const TestRandomTag = tag<TestRandom>()

export class TestRandom implements Random {
  constructor(readonly randomState: URef<Data>, readonly bufferState: URef<Buffer>) {}

  clearBooleans: UIO<void> = Ref.update_(this.bufferState, (buff) => buff.copy({ booleans: Li.empty() }))
  clearBytes: UIO<void>    = Ref.update_(this.bufferState, (buff) => buff.copy({ bytes: Li.empty() }))
  clearChars: UIO<void>    = Ref.update_(this.bufferState, (buff) => buff.copy({ chars: Li.empty() }))
  clearDoubles: UIO<void>  = Ref.update_(this.bufferState, (buff) => buff.copy({ doubles: Li.empty() }))
  clearInts: UIO<void>     = Ref.update_(this.bufferState, (buff) => buff.copy({ integers: Li.empty() }))
  clearStrings: UIO<void>  = Ref.update_(this.bufferState, (buff) => buff.copy({ strings: Li.empty() }))
  feedBooleans(...booleans: ReadonlyArray<boolean>): UIO<void> {
    return Ref.update_(this.bufferState, (buff) =>
      buff.copy({ booleans: Li.concat_(Li.from(booleans), buff.booleans) })
    )
  }
  feedBytes(...bytes: ReadonlyArray<Chunk<Byte>>): UIO<void> {
    return Ref.update_(this.bufferState, (data) => data.copy({ bytes: Li.concat_(Li.from(bytes), data.bytes) }))
  }
  feedChars(...chars: ReadonlyArray<string>): UIO<void> {
    return Ref.update_(this.bufferState, (data) => data.copy({ chars: Li.concat_(Li.from(chars), data.chars) }))
  }
  feedDoubles(...doubles: ReadonlyArray<number>): UIO<void> {
    return Ref.update_(this.bufferState, (data) => data.copy({ doubles: Li.concat_(Li.from(doubles), data.doubles) }))
  }
  feedInts(...ints: ReadonlyArray<number>): UIO<void> {
    return Ref.update_(this.bufferState, (data) => data.copy({ integers: Li.concat_(Li.from(ints), data.integers) }))
  }
  feedStrings(...strings: ReadonlyArray<string>): UIO<void> {
    return Ref.update_(this.bufferState, (data) => data.copy({ strings: Li.concat_(Li.from(strings), data.strings) }))
  }
  getSeed: UIO<number> = this.randomState.get['<$>']((data) => ((data.seed1 << 24) | data.seed2) ^ 0x5deece66d)

  setSeed(seed: string): UIO<void> {
    const mash    = Mash()
    const newSeed = mash(seed)
    const seed1   = Math.floor(newSeed >>> 24)
    const seed2   = Math.floor(newSeed) & ((1 << 24) - 1)
    return this.randomState.set(new Data(seed1, seed2, new ImmutableQueue([])))
  }

  private bufferedBoolean = (buffer: Buffer): readonly [Option<boolean>, Buffer] => {
    return [Li.first(buffer.booleans), buffer.copy({ booleans: Li.drop_(buffer.booleans, 1) })]
  }
  private bufferedByte    = (buffer: Buffer): readonly [Option<Chunk<Byte>>, Buffer] => {
    return [Li.first(buffer.bytes), buffer.copy({ bytes: Li.drop_(buffer.bytes, 1) })]
  }
  private bufferedChar    = (buffer: Buffer): readonly [Option<string>, Buffer] => {
    return [Li.first(buffer.chars), buffer.copy({ chars: Li.drop_(buffer.chars, 1) })]
  }
  private bufferedDouble  = (buffer: Buffer): readonly [Option<number>, Buffer] => {
    return [Li.first(buffer.doubles), buffer.copy({ doubles: Li.drop_(buffer.doubles, 1) })]
  }
  private bufferedInt     = (buffer: Buffer): readonly [Option<number>, Buffer] => {
    return [Li.first(buffer.integers), buffer.copy({ integers: Li.drop_(buffer.doubles, 1) })]
  }
  private bufferedString  = (buffer: Buffer): readonly [Option<string>, Buffer] => {
    return [Li.first(buffer.strings), buffer.copy({ strings: Li.drop_(buffer.strings, 1) })]
  }

  private getOrElse = <A>(buffer: (_: Buffer) => readonly [Option<A>, Buffer], random: UIO<A>): UIO<A> => {
    return Ref.modify_(this.bufferState, buffer)['>>='](O.match(() => random, I.succeed))
  }

  private leastSignificantBits = (x: number): number => {
    return Math.floor(x) & ((1 << 24) - 1)
  }

  private mostSignificantBits = (x: number): number => {
    return Math.floor(x / (1 << 24))
  }

  private randomBits = (bits: number): UIO<number> => {
    return Ref.modify_(this.randomState, (data) => {
      const multiplier  = 0x5deece66d
      const multiplier1 = Math.floor(multiplier >>> 24)
      const multiplier2 = Math.floor(multiplier) & ((1 << 24) - 1)
      const product1    = data.seed1 * multiplier1 + data.seed1 * multiplier2
      const product2    = data.seed2 * multiplier2 + 0xb
      const newSeed1    = (this.mostSignificantBits(product2) + this.leastSignificantBits(product1)) & ((1 << 24) - 1)
      const newSeed2    = this.leastSignificantBits(product2)
      const result      = (newSeed1 << 8) | (newSeed2 >> 16)
      return [result >>> (32 - bits), new Data(newSeed1, newSeed2, data.nextNextGaussians)]
    })
  }

  private randomBoolean = this.randomBits(1)['<$>']((n) => n !== 0)

  private randomBytes = (length: number): UIO<Chunk<Byte>> => {
    const loop = (i: number, rnd: UIO<number>, n: number, acc: UIO<List<Byte>>): UIO<List<Byte>> => {
      if (i === length) {
        return acc['<$>'](Li.reverse)
      } else if (n > 0) {
        return rnd['>>=']((rnd) => loop(i + 1, I.succeed(rnd >> 8), n - 1, acc['<$>'](Li.prepend(Byte.wrap(rnd)))))
      } else {
        return loop(i, this.nextInt, Math.min(length - i, 4), acc)
      }
    }

    return loop(0, this.randomInt, Math.min(length, 4), I.succeed(Li.empty()))['<$>'](Li.toArray)
  }

  private randomIntBounded = (n: number) => {
    if (n <= 0) {
      return I.die(new IllegalArgumentError('n must be positive', 'TestRandom.randomIntBounded'))
    } else if ((n & -n) === n) {
      return this.randomBits(31)['<$>']((_) => _ >> Math.clz32(n))
    } else {
      const loop: UIO<number> = this.randomBits(31)['>>=']((i) => {
        const value = i % n
        if (i - value + (n - 1) < 0) return loop
        else return I.succeed(value)
      })
      return loop
    }
  }

  private randomInt = this.randomBits(32)

  private randomDouble = this.randomBits(26)['>>=']((i1) =>
    this.randomBits(27)['<$>']((i2) => (i1 * (1 << 27) + i2) / (1 << 53))
  )

  private random = this.randomBits(26)

  get nextInt(): UIO<number> {
    return this.getOrElse(this.bufferedInt, this.randomInt)
  }

  get nextBoolean(): UIO<boolean> {
    return this.getOrElse(this.bufferedBoolean, this.randomBoolean)
  }

  get nextDouble(): UIO<number> {
    return this.getOrElse(this.bufferedDouble, this.randomDouble)
  }

  get next(): UIO<number> {
    return this.getOrElse(this.bufferedDouble, this.random)
  }

  nextIntBetween(low: number, high: number): UIO<number> {
    return nextIntBetweenWith(low, high, this.randomInt, this.randomIntBounded)
  }

  nextRange(low: number, high: number): UIO<number> {
    return this.next['<$>']((n) => (high - low + 1) * n + low)
  }

  static make(initialData: Data): L.Layer<unknown, never, Has<Random> & Has<TestRandom>> {
    return L.fromRawEffect(
      I.gen(function* (_) {
        const data   = yield* _(Ref.make(initialData))
        const buffer = yield* _(Ref.make(new Buffer()))
        const test   = new TestRandom(data, buffer)
        return intersect(TestRandomTag.of(test), RandomTag.of(test))
      })
    )
  }

  static get determinictic() {
    return TestRandom.make(defaultData)
  }

  static random(): L.Layer<Has<Clock>, never, Has<Random> & Has<TestRandom>> {
    return L.fromEffect(ClockTag)(I.askService(ClockTag))
      ['+++'](this.determinictic)
      ['>>>'](
        L.fromRawFunctionM((env: Has<Clock> & Has<Random> & Has<TestRandom>) => {
          const random     = RandomTag.read(env)
          const testRandom = TestRandomTag.read(env)
          return I.gen(function* (_) {
            const time = yield* _(ClockTag.read(env).currentTime)
            yield* _(TestRandomTag.read(env).setSeed(time.toString(10)))
            return intersect(RandomTag.of(random), TestRandomTag.of(testRandom))
          })
        })
      )
  }

  private static _lifted = I.deriveLifted(TestRandomTag)(
    ['nextRange', 'nextIntBetween', 'setSeed'],
    [
      'clearInts',
      'clearBytes',
      'clearChars',
      'clearDoubles',
      'clearStrings',
      'clearBooleans',
      'next',
      'nextInt',
      'nextDouble',
      'nextBoolean',
      'getSeed'
    ],
    []
  )

  static clearInts     = TestRandom._lifted.clearInts
  static clearBytes    = TestRandom._lifted.clearBytes
  static clearChars    = TestRandom._lifted.clearChars
  static clearDoubles  = TestRandom._lifted.clearDoubles
  static clearStrings  = TestRandom._lifted.clearStrings
  static clearBooleans = TestRandom._lifted.clearBooleans
  static feedInts(...ints: ReadonlyArray<number>) {
    return I.asksServiceM(TestRandomTag)((tr) => tr.feedInts(...ints))
  }
  static feedBytes(...bytes: ReadonlyArray<Chunk<Byte>>) {
    return I.asksServiceM(TestRandomTag)((tr) => tr.feedBytes(...bytes))
  }
  static feedChars(...chars: ReadonlyArray<string>) {
    return I.asksServiceM(TestRandomTag)((tr) => tr.feedChars(...chars))
  }
  static feedDoubles(...doubles: ReadonlyArray<number>) {
    return I.asksServiceM(TestRandomTag)((tr) => tr.feedDoubles(...doubles))
  }
  static feedStrings(...strings: ReadonlyArray<string>) {
    return I.asksServiceM(TestRandomTag)((tr) => tr.feedStrings(...strings))
  }
  static feedBooleans(...booleans: ReadonlyArray<boolean>) {
    return I.asksServiceM(TestRandomTag)((tr) => tr.feedBooleans(...booleans))
  }
  static next           = TestRandom._lifted.next
  static nextInt        = TestRandom._lifted.nextInt
  static nextDouble     = TestRandom._lifted.nextDouble
  static nextBoolean    = TestRandom._lifted.nextBoolean
  static nextRange      = TestRandom._lifted.nextRange
  static nextIntBetween = TestRandom._lifted.nextIntBetween
  static setSeed        = TestRandom._lifted.setSeed
  static getSeed        = TestRandom._lifted.getSeed
}

/**
 * @internal
 */
function nextIntBetweenWith(
  min: number,
  max: number,
  nextInt: UIO<number>,
  nextIntBounded: (_: number) => UIO<number>
): UIO<number> {
  if (min >= max) {
    return I.die(new IllegalArgumentError('invalid bounds', 'TestRandom.nextIntBetweenWith'))
  } else {
    const difference = max - min
    if (difference > 0) return nextIntBounded(difference)['<$>']((n) => n + min)
    else return I.repeatUntil_(nextInt, (n) => min <= n && n < max)
  }
}

class Data {
  constructor(
    readonly seed1: number,
    readonly seed2: number,
    readonly nextNextGaussians: ImmutableQueue<number> = new ImmutableQueue([])
  ) {}
}

const defaultData = new Data(1071905196, 1911589680)

class Buffer {
  constructor(
    readonly booleans: List<boolean> = Li.empty(),
    readonly bytes: List<Chunk<Byte>> = Li.empty(),
    readonly chars: List<string> = Li.empty(),
    readonly doubles: List<number> = Li.empty(),
    readonly integers: List<number> = Li.empty(),
    readonly strings: List<string> = Li.empty()
  ) {}

  copy(_: Partial<Buffer>): Buffer {
    return new Buffer(
      _.booleans ?? this.booleans,
      _.bytes ?? this.bytes,
      _.chars ?? this.chars,
      _.doubles ?? this.doubles,
      _.integers ?? this.integers,
      _.strings ?? this.strings
    )
  }
}
