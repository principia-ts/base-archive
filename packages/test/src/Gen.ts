import type { ArrayInt64 } from './util/math'
import type { Chunk } from '@principia/base/Chunk'
import type { Has } from '@principia/base/Has'
import type { IO } from '@principia/base/IO'
import type { Predicate } from '@principia/base/Predicate'
import type { _A, _R, UnionToIntersection } from '@principia/base/prelude'
import type { Refinement } from '@principia/base/Refinement'
import type { Stream } from '@principia/base/Stream'

import * as A from '@principia/base/Array'
import * as C from '@principia/base/Chunk'
import * as E from '@principia/base/Either'
import * as Eq from '@principia/base/Eq'
import { IllegalArgumentError, NoSuchElementError } from '@principia/base/Error'
import { sequential } from '@principia/base/ExecutionStrategy'
import { identity, pipe } from '@principia/base/function'
import * as I from '@principia/base/IO'
import * as N from '@principia/base/number'
import * as O from '@principia/base/Option'
import { OrderedMap } from '@principia/base/OrderedMap'
import * as OM from '@principia/base/OrderedMap'
import { Random } from '@principia/base/Random'
import * as S from '@principia/base/Stream'
import * as Str from '@principia/base/string'
import * as St from '@principia/base/Structural'
import * as Th from '@principia/base/These'
import { tuple } from '@principia/base/tuple'

import { Sample, shrinkFractional } from './Sample'
import * as Sa from './Sample'
import { Sized } from './Sized'
import {
  add64,
  clamp,
  computeArrayInt64GenerateRange,
  indexToDouble,
  indexToFloat,
  isStrictlyPositive64,
  isStrictlySmaller64,
  MAX_VALUE_32,
  safeDoubleToIndex,
  safeFloatToIndex,
  substract64,
  Unit64
} from './util/math'

/*
 * -------------------------------------------------------------------------------------------------
 * Model
 * -------------------------------------------------------------------------------------------------
 */

export class Gen<R, A> {
  readonly _R!: (_: R) => void
  readonly _A!: () => A
  constructor(readonly sample: Stream<R, never, Sample<R, A>>) {}
}

export interface LengthConstraints {
  minLength?: number
  maxLength?: number
}

export interface EqConstraint<A> {
  eq?: Eq.Eq<A>
}

export interface DateConstraints {
  min?: Date
  max?: Date
}

export interface ObjectConstraints {
  maxDepth?: number
  maxKeys?: number
  key?: Gen<any, string>
  values?: Gen<any, any>[]
  withSet?: boolean
  withMap?: boolean
  withBigint?: boolean
  withDate?: boolean
  withTypedArray?: boolean
}

export interface IntArrayConstraints {
  min?: number
  max?: number
}

export interface FloatConstraints {
  min?: number
  max?: number
  noDefaultInfinity?: boolean
  noNaN?: boolean
}

/*
 * -------------------------------------------------------------------------------------------------
 * Constructors
 * -------------------------------------------------------------------------------------------------
 */

export function constant<A>(a: A): Gen<unknown, A> {
  return new Gen(S.succeed(Sa.noShrink(a)))
}

export function defer<R, A>(gen: () => Gen<R, A>): Gen<R, A> {
  return pipe(I.effectTotal(gen), fromEffect, flatten)
}

export function fromEffect<R, A>(effect: IO<R, never, A>): Gen<R, A> {
  return new Gen(S.fromEffect(I.map_(effect, Sa.noShrink)))
}

export function fromEffectSample<R, A>(effect: IO<R, never, Sample<R, A>>): Gen<R, A> {
  return new Gen(S.fromEffect(effect))
}

/*
 * -------------------------------------------------------------------------------------------------
 * Primitives
 * -------------------------------------------------------------------------------------------------
 */

export function alphaNumericChar(): Gen<Has<Random>, string> {
  return weighted([char(48, 57), 10], [char(65, 90), 26], [char(97, 122), 26])
}

export function alphaNumericString(constraints: LengthConstraints = {}): Gen<Has<Random> & Has<Sized>, string> {
  return string(alphaNumericChar(), constraints)
}

export function anyBigInt(): Gen<Has<Random>, bigint> {
  return fromEffectSample(
    I.map_(
      Random.nextBigIntBetween(BigInt(-1) << BigInt(255), (BigInt(1) << BigInt(255)) - BigInt(1)),
      Sa.shrinkBigInt(BigInt(0))
    )
  )
}

export function anyDouble(): Gen<Has<Random>, number> {
  return fromEffectSample(I.map_(Random.next, shrinkFractional(0)))
}

export function anyInt(): Gen<Has<Random>, number> {
  return fromEffectSample(I.map_(Random.nextInt, Sa.shrinkIntegral(0)))
}

export function arrayInt64(min: ArrayInt64, max: ArrayInt64): Gen<Has<Random>, ArrayInt64> {
  return pipe(
    computeArrayInt64GenerateRange(min, max, undefined, undefined),
    S.fromEffect,
    S.bind(({ min, max }) => S.repeatEffect(Random.nextArrayInt(min, max))),
    S.map((uncheckedValue) => {
      if (uncheckedValue.data.length === 1) {
        uncheckedValue.data.unshift(0)
      }
      return Sa.shrinkArrayInt64(min)(uncheckedValue as ArrayInt64)
    }),
    (_) => new Gen(_)
  )
}

export function ascii(): Gen<Has<Random>, string> {
  return char(0x00, 0x7f)
}

export function float(constraints: FloatConstraints = {}): Gen<Has<Random>, number> {
  const {
    noDefaultInfinity = false,
    min = noDefaultInfinity ? -MAX_VALUE_32 : Number.NEGATIVE_INFINITY,
    max = noDefaultInfinity ? MAX_VALUE_32 : Number.POSITIVE_INFINITY,
    noNaN = false
  } = constraints
  return pipe(
    I.gen(function* (_) {
      const minIndex = yield* _(safeFloatToIndex(min, 'min'))
      const maxIndex = yield* _(safeFloatToIndex(max, 'max'))
      if (minIndex > maxIndex) {
        return yield* _(I.die(new Error('Gen.float constraints.min must be less than or equal to constraints.max')))
      }
      if (noNaN) {
        return pipe(int(minIndex, maxIndex), map(indexToFloat))
      }
      const minIndexWithNaN = maxIndex > 0 ? minIndex : minIndex - 1
      const maxIndexWithNaN = maxIndex > 0 ? maxIndex + 1 : maxIndex
      return pipe(
        int(minIndexWithNaN, maxIndexWithNaN),
        map((index) => {
          if (index > maxIndex || index < minIndex) return Number.NaN
          else return indexToFloat(index)
        })
      )
    }),
    unwrap
  )
}

export function double(constraints: FloatConstraints = {}): Gen<Has<Random>, number> {
  const {
    noDefaultInfinity = false,
    noNaN = false,
    min = noDefaultInfinity ? -Number.MAX_VALUE : Number.NEGATIVE_INFINITY,
    max = noDefaultInfinity ? Number.MAX_VALUE : Number.POSITIVE_INFINITY
  } = constraints
  return pipe(
    I.gen(function* (_) {
      const minIndex = yield* _(safeDoubleToIndex(min, 'min'))
      const maxIndex = yield* _(safeDoubleToIndex(max, 'max'))
      if (isStrictlySmaller64(maxIndex, minIndex)) {
        return yield* _(I.die(new IllegalArgumentError('min must be less than or equal to max', 'Gen.double')))
      }
      if (noNaN) {
        return map_(arrayInt64(minIndex, maxIndex), indexToDouble)
      }
      const positiveMaxIdx  = isStrictlyPositive64(maxIndex)
      const minIndexWithNaN = positiveMaxIdx ? minIndex : substract64(minIndex, Unit64)
      const maxIndexWithNaN = positiveMaxIdx ? add64(maxIndex, Unit64) : maxIndex
      return map_(arrayInt64(minIndexWithNaN, maxIndexWithNaN), (index) => {
        if (isStrictlySmaller64(maxIndex, index) || isStrictlySmaller64(index, minIndex)) return Number.NaN
        else return indexToDouble(index)
      })
    }),
    unwrap
  )
}

export function empty(): Gen<unknown, never> {
  return new Gen(S.empty)
}

export function exponential(): Gen<Has<Random>, number> {
  return map_(uniform(), (n) => -Math.log(1 - n))
}

export function printableChar(): Gen<Has<Random>, string> {
  return char(33, 126)
}

export function none(): Gen<unknown, O.Option<never>> {
  return constant(O.none())
}

export function uniform(): Gen<Has<Random>, number> {
  return fromEffectSample(I.map_(Random.next, Sa.shrinkFractional(0.0)))
}

export function unit(): Gen<unknown, void> {
  return constant(undefined)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Apply
 * -------------------------------------------------------------------------------------------------
 */

export function crossWith_<R, A, R1, B, C>(fa: Gen<R, A>, fb: Gen<R1, B>, f: (a: A, b: B) => C): Gen<R & R1, C> {
  return bind_(fa, (a) => map_(fb, (b) => f(a, b)))
}

export function crossWith<A, R1, B, C>(fb: Gen<R1, B>, f: (a: A, b: B) => C): <R>(fa: Gen<R, A>) => Gen<R & R1, C> {
  return (fa) => crossWith_(fa, fb, f)
}

export function cross_<R, A, R1, B>(fa: Gen<R, A>, fb: Gen<R1, B>): Gen<R & R1, readonly [A, B]> {
  return crossWith_(fa, fb, tuple)
}

export function cross<R1, B>(fb: Gen<R1, B>): <R, A>(fa: Gen<R, A>) => Gen<R & R1, readonly [A, B]> {
  return (fa) => cross_(fa, fb)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Functor
 * -------------------------------------------------------------------------------------------------
 */

export function map_<R, A, B>(fa: Gen<R, A>, f: (a: A) => B): Gen<R, B> {
  return new Gen(S.map_(fa.sample, Sa.map(f)))
}

export function map<A, B>(f: (a: A) => B): <R>(fa: Gen<R, A>) => Gen<R, B> {
  return (fa) => map_(fa, f)
}

export function mapM_<R, A, R1, B>(fa: Gen<R, A>, f: (a: A) => IO<R1, never, B>): Gen<R & R1, B> {
  return new Gen(S.mapM_(fa.sample, Sa.foreach(f)))
}

export function mapM<A, R1, B>(f: (a: A) => IO<R1, never, B>): <R>(fa: Gen<R, A>) => Gen<R & R1, B> {
  return (fa) => mapM_(fa, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Monad
 * -------------------------------------------------------------------------------------------------
 */

export function bind_<R, A, R1, B>(ma: Gen<R, A>, f: (a: A) => Gen<R1, B>): Gen<R & R1, B> {
  return new Gen(
    pipe(
      ma.sample,
      S.bind((sample) => {
        const values  = f(sample.value).sample
        const shrinks = pipe(
          new Gen(sample.shrink),
          bind((a) => f(a))
        ).sample
        return pipe(
          values,
          S.map((sample) => Sa.bind_(sample, (b) => new Sample(b, shrinks)))
        )
      })
    )
  )
}

export function bind<A, R1, B>(f: (a: A) => Gen<R1, B>): <R>(ma: Gen<R, A>) => Gen<R & R1, B> {
  return (ma) => bind_(ma, f)
}

export function flatten<R, R1, A>(mma: Gen<R, Gen<R1, A>>): Gen<R & R1, A> {
  return bind_(mma, identity)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Filterable
 * -------------------------------------------------------------------------------------------------
 */

export function filter_<R, A, B extends A>(fa: Gen<R, A>, f: Refinement<A, B>): Gen<R, B>
export function filter_<R, A>(fa: Gen<R, A>, f: Predicate<A>): Gen<R, A>
export function filter_<R, A>(fa: Gen<R, A>, f: Predicate<A>): Gen<R, A> {
  return new Gen(
    pipe(
      fa.sample,
      S.bind((sample) => (f(sample.value) ? Sa.filter_(sample, f) : S.empty))
    )
  )
}

export function filter<A, B extends A>(f: Refinement<A, B>): <R>(fa: Gen<R, A>) => Gen<R, B>
export function filter<A>(f: Predicate<A>): <R>(fa: Gen<R, A>) => Gen<R, A>
export function filter<A>(f: Predicate<A>): <R>(fa: Gen<R, A>) => Gen<R, A> {
  return (fa) => filter_(fa, f)
}

export function filterNot_<R, A>(fa: Gen<R, A>, f: Predicate<A>): Gen<R, A> {
  return filter_(fa, (a) => !f(a))
}

export function filterNot<A>(f: Predicate<A>): <R>(fa: Gen<R, A>) => Gen<R, A> {
  return (fa) => filterNot_(fa, f)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Combinators
 * -------------------------------------------------------------------------------------------------
 */

export function anything<C extends ObjectConstraints>(
  constraints: C = {} as any
): Gen<
  ObjectConstraints extends C
    ? Has<Random> & Has<Sized>
    : unknown extends C['key']
    ? Has<Random> & Has<Sized>
    : _R<C['key']> & C['values'] extends Array<infer A>
    ? _R<A>
    : Has<Random> & Has<Sized> & Has<Random> & Has<Sized>,
  unknown
> {
  const key      = constraints.key || alphaNumericString()
  const maxDepth = constraints.maxDepth || 2
  const maxKeys  = constraints.maxKeys || 5
  const values   = constraints.values || [
    boolean(),
    alphaNumericString(),
    double(),
    anyInt(),
    oneOf(alphaNumericString(), constant(null), constant(undefined))
  ]

  const mapOf = <R, K, R1, V>(key: Gen<R, K>, value: Gen<R1, V>) =>
    pipe(
      tupleOf(key, value),
      uniqueChunkOf({ eq: Eq.contramap_(St.DefaultEq, ([k]) => k) }),
      map((c) => new Map(c))
    )

  const setOf = <R, V>(value: Gen<R, V>) =>
    pipe(
      value,
      uniqueChunkOf({ eq: St.DefaultEq, maxLength: maxKeys }),
      map((c) => new Set(c))
    )

  const base       = oneOf(...values)
  const arrayBase  = oneOf(...A.map_(values, (gen) => arrayOf(gen, { maxLength: maxKeys })))
  const arrayGen   = memo((n) => oneOf(arrayBase, arrayOf(gen(n), { maxLength: maxKeys })))
  const objectBase = oneOf(...A.map_(values, (gen) => dictionary(key, gen)))
  const objectGen  = memo((n) => oneOf(objectBase, dictionary(key, gen(n))))
  const setBase    = oneOf(...A.map_(values, setOf))
  const setGen     = memo((n) => oneOf(setBase, setOf(gen(n))))
  const mapBase    = oneOf(...A.map_(values, (_) => mapOf(key, _)))
  const mapGen     = memo((n) => oneOf(mapBase, mapOf(oneOf(key, gen(n)), gen(n))))

  const gen: (n: number) => Gen<any, any> = memo((n) => {
    if (n <= 0) return base
    return oneOf(
      base,
      arrayGen(),
      objectGen(),
      ...(constraints.withDate ? [date()] : []),
      ...(constraints.withSet ? [setGen()] : []),
      ...(constraints.withMap ? [mapGen()] : []),
      ...(constraints.withTypedArray
        ? [oneOf(int8Array(), uint8Array(), int16Array(), uint16Array(), int32Array(), uint32Array())]
        : [])
    )
  })
  return gen(maxDepth)
}

export function arrayOf<R, A>(
  g: Gen<R, A>,
  constraints: LengthConstraints = {}
): Gen<R & Has<Random> & Has<Sized>, ReadonlyArray<A>> {
  const minLength = constraints.minLength || 0
  return constraints.maxLength
    ? bind_(int(minLength, constraints.maxLength), (n) => arrayOfN_(g, n))
    : small((n) => arrayOfN_(g, n), minLength)
}

export function arrayOfN_<R, A>(g: Gen<R, A>, n: number): Gen<R, ReadonlyArray<A>> {
  return pipe(chunkOfN_(g, n), map(C.toArray))
}

export function arrayOfN(n: number): <R, A>(g: Gen<R, A>) => Gen<R, ReadonlyArray<A>> {
  return (g) => arrayOfN_(g, n)
}

export function asciiString<R>(constraints?: LengthConstraints): Gen<R & Has<Random> & Has<Sized>, string> {
  return map_(arrayOf(ascii(), constraints), A.join(''))
}

export function boolean(): Gen<Has<Random>, boolean> {
  return oneOf(constant(true), constant(false))
}

export function bounded<R, A>(min: number, max: number, f: (n: number) => Gen<R, A>): Gen<R & Has<Random>, A> {
  return bind_(int(min, max), f)
}

export function char(min: number, max: number): Gen<Has<Random>, string> {
  return map_(int(min, max), (n) => String.fromCharCode(n))
}

export function chunkOf<R, A>(
  g: Gen<R, A>,
  constraints: LengthConstraints = {}
): Gen<R & Has<Random> & Has<Sized>, Chunk<A>> {
  const minLength = constraints.minLength || 0
  return constraints.maxLength
    ? bind_(int(minLength, constraints.maxLength), (n) => chunkOfN_(g, n))
    : small((n) => chunkOfN_(g, n), minLength)
}

export function chunkOfN_<R, A>(g: Gen<R, A>, n: number): Gen<R, Chunk<A>> {
  return pipe(
    C.replicate(n, g),
    C.foldl(constant(C.empty()) as Gen<R, Chunk<A>>, (gen, a) => crossWith_(gen, a, C.append_))
  )
}

export function chunkOfN(n: number): <R, A>(g: Gen<R, A>) => Gen<R, Chunk<A>> {
  return (g) => chunkOfN_(g, n)
}

export function date(constraints: DateConstraints = {}): Gen<Has<Random>, Date> {
  const min = constraints.min ? constraints.min.getTime() : -8_640_000_000_000_000
  const max = constraints.max ? constraints.max.getTime() : 8_640_000_000_000_000
  return pipe(
    int(min, max),
    map((n) => new Date(n))
  )
}

export function dictionary<R, R1, V>(
  key: Gen<R, string>,
  value: Gen<R1, V>,
  constraints?: LengthConstraints
): Gen<Has<Random> & Has<Sized> & R & R1, Record<string, V>> {
  return pipe(
    tupleOf(key, value),
    uniqueChunkOf({ eq: Eq.contramap_(Str.Eq, ([k]) => k), ...constraints }),
    map(C.foldl({} as Record<string, V>, (b, [k, v]) => ({ ...b, [k]: v })))
  )
}

export function int(min: number, max: number): Gen<Has<Random>, number> {
  return fromEffectSample(
    I.deferTotal(() => {
      if (min > max || min < Number.MIN_SAFE_INTEGER || max > Number.MAX_SAFE_INTEGER) {
        return I.die(new IllegalArgumentError('invalid bounds', 'Gen.int'))
      } else {
        return I.map_(Random.nextIntBetween(min, max), Sa.shrinkIntegral(min))
      }
    })
  )
}

function typedArray<A>(
  constraints: LengthConstraints & IntArrayConstraints,
  minBound: number,
  maxBound: number,
  ctor: { new (arg: ReadonlyArray<number>): A }
): Gen<Has<Random> & Has<Sized>, A> {
  const min = constraints.min ? clamp(constraints.min, minBound, maxBound) : minBound
  const max = constraints.max ? clamp(constraints.max, minBound, maxBound) : maxBound
  return pipe(
    arrayOf(int(min, max), constraints),
    map((n) => new ctor(n))
  )
}

export function int8Array(
  constraints: LengthConstraints & IntArrayConstraints = {}
): Gen<Has<Random> & Has<Sized>, Int8Array> {
  return typedArray(constraints, -128, 127, Int8Array)
}

export function int16Array(
  constraints: LengthConstraints & IntArrayConstraints = {}
): Gen<Has<Random> & Has<Sized>, Int16Array> {
  return typedArray(constraints, -32768, 32767, Int16Array)
}

export function int32Array(
  constraints: LengthConstraints & IntArrayConstraints = {}
): Gen<Has<Random> & Has<Sized>, Int32Array> {
  return typedArray(constraints, -0x80000000, 0x7fffffff, Int32Array)
}

export function uint8Array(
  constraints: LengthConstraints & IntArrayConstraints = {}
): Gen<Has<Random> & Has<Sized>, Uint8Array> {
  return typedArray(constraints, 0, 255, Uint8Array)
}

export function uint16Array(
  constraints: LengthConstraints & IntArrayConstraints = {}
): Gen<Has<Random> & Has<Sized>, Uint16Array> {
  return typedArray(constraints, 0, 65535, Uint16Array)
}

export function uint32Array(
  constraints: LengthConstraints & IntArrayConstraints = {}
): Gen<Has<Random> & Has<Sized>, Uint32Array> {
  return typedArray(constraints, 0, 0xffffffff, Uint32Array)
}

export function memo<R, A>(builder: (maxDepth: number) => Gen<R, A>): (maxDepth?: number) => Gen<R, A> {
  const previous: { [depth: number]: Gen<R, A> } = {}
  let remainingDepth                             = 10
  return (maxDepth?: number): Gen<R, A> => {
    const n = maxDepth !== undefined ? maxDepth : remainingDepth
    if (!Object.prototype.hasOwnProperty.call(previous, n)) {
      const prev     = remainingDepth
      remainingDepth = n - 1
      // eslint-disable-next-line functional/immutable-data
      previous[n]    = builder(n)
      remainingDepth = prev
    }
    return previous[n]
  }
}

/**
 * A sized generator that uses an exponential distribution of size values.
 * The majority of sizes will be towards the lower end of the range but some
 * larger sizes will be generated as well.
 */
export function medium<R, A>(f: (n: number) => Gen<R, A>, min = 0): Gen<R & Has<Random> & Has<Sized>, A> {
  return pipe(
    size,
    bind((max) => map_(exponential(), (n) => clamp(Math.round((n * max) / 10.0), min, max))),
    reshrink(Sa.shrinkIntegral(min)),
    bind(f)
  )
}

export function nat(max = 0x7fffffff): Gen<Has<Random>, number> {
  return int(0, clamp(max, 0, max))
}

export function option<R, A>(gen: Gen<R, A>): Gen<R & Has<Random>, O.Option<A>> {
  return oneOf(none(), some(gen))
}

export function oneOf<A extends ReadonlyArray<Gen<any, any>>>(
  ...gens: A
): Gen<_R<A[number]> & Has<Random>, _A<A[number]>> {
  if (A.isEmpty(gens)) return empty()
  else return bind_(int(0, gens.length - 1), (i) => gens[i])
}

export function partial<P extends Record<string, Gen<any, any>>>(
  properties: P
): Gen<_R<P[keyof P]>, Partial<{ [K in keyof P]: _A<P[K]> }>> {
  const entries = Object.entries(properties)
  return A.foldl_(entries, constant({}) as Gen<any, any>, (b, [k, genV]) =>
    pipe(
      Random.next,
      I.map((n) => n > 0.5),
      I.ifM(
        () => I.succeed(crossWith_(b, genV, (r, v) => ({ ...r, [k]: v }))),
        () => I.succeed(b)
      ),
      unwrap
    )
  )
}

export function reshrink_<R, A, R1, B>(gen: Gen<R, A>, f: (a: A) => Sample<R1, B>): Gen<R & R1, B> {
  return new Gen(S.map_(gen.sample, (s) => f(s.value)) as Stream<R & R1, never, Sample<R & R1, B>>)
}

export function reshrink<A, R1, B>(f: (a: A) => Sample<R1, B>): <R>(gen: Gen<R, A>) => Gen<R & R1, B> {
  return (gen) => reshrink_(gen, f)
}

export const size: Gen<Has<Sized>, number> = fromEffect(Sized.size)

export function sized<R, A>(f: (size: number) => Gen<R, A>): Gen<R & Has<Sized>, A> {
  return bind_(size, f)
}

export function small<R, A>(f: (n: number) => Gen<R, A>, min = 0): Gen<Has<Sized> & Has<Random> & R, A> {
  return pipe(
    size,
    bind((max) => map_(exponential(), (n) => clamp(Math.round((n * max) / 25), min, max))),
    reshrink(Sa.shrinkIntegral(min)),
    bind(f)
  )
}

export function some<R, A>(gen: Gen<R, A>): Gen<R, O.Option<A>> {
  return map_(gen, O.some)
}

export function string<R>(
  char: Gen<R, string>,
  constraints: LengthConstraints = {}
): Gen<R & Has<Random> & Has<Sized>, string> {
  const min = constraints.minLength || 0
  return constraints.maxLength
    ? bounded(min, constraints.maxLength, (n) => stringN(char, n))
    : small((n) => stringN(char, n), min)
}

export function stringBounded<R>(char: Gen<R, string>, min: number, max: number): Gen<R & Has<Random>, string> {
  return bounded(min, max, (n) => stringN(char, n))
}

export function stringN<R>(char: Gen<R, string>, n: number): Gen<R, string> {
  return map_(arrayOfN_(char, n), A.join(''))
}

export function struct<P extends Record<string, Gen<any, any>>>(
  properties: P
): Gen<UnionToIntersection<_R<P[keyof P]>>, { readonly [K in keyof P]: _A<P[K]> }> {
  const entries = Object.entries(properties)
  return A.foldl_(entries, constant({}) as Gen<any, any>, (b, [k, genV]) =>
    crossWith_(b, genV, (out, v) => ({ ...out, [k]: v }))
  )
}

export function tupleOf<C extends ReadonlyArray<Gen<any, any>>>(
  ...components: C
): Gen<_R<C[number]>, { [K in keyof C]: _A<C[K]> }> {
  return A.foldl_(components, constant<Array<any>>([]) as Gen<_R<C[keyof C]>, any>, (b, a) =>
    crossWith_(b, a, (bs, x) => [...bs, x])
  )
}

export function uniqueChunkOf_<R, A>(
  gen: Gen<R, A>,
  constraints: LengthConstraints & EqConstraint<A> = {}
): Gen<Has<Random> & Has<Sized> & R, Chunk<A>> {
  const minLength = constraints.minLength || 0
  const eq        = constraints.eq || St.DefaultEq
  return constraints.maxLength
    ? bounded(minLength, constraints.maxLength, (n) => uniqueChunkOfN_(eq)(gen, n))
    : small((n) => uniqueChunkOfN_(eq)(gen, n), minLength)
}

export function uniqueChunkOf<A>(
  constraints: LengthConstraints & EqConstraint<A> = {}
): <R>(gen: Gen<R, A>) => Gen<Has<Random> & Has<Sized> & R, Chunk<A>> {
  return (gen) => uniqueChunkOf_(gen, constraints)
}

export function uniqueArrayOf_<R, A>(
  gen: Gen<R, A>,
  constraints: LengthConstraints & EqConstraint<A> = {}
): Gen<Has<Random> & Has<Sized> & R, ReadonlyArray<A>> {
  return pipe(uniqueChunkOf_(gen, constraints), map(C.toArray))
}

export function uniqueArrayOf<A>(
  constraints: LengthConstraints & EqConstraint<A> = {}
): <R>(gen: Gen<R, A>) => Gen<Has<Random> & Has<Sized> & R, ReadonlyArray<A>> {
  return (gen) => uniqueArrayOf_(gen, constraints)
}

export function uniqueChunkOfN_<A>(E: Eq.Eq<A>): <R>(g: Gen<R, A>, n: number) => Gen<R, Chunk<A>> {
  return <R>(g: Gen<R, A>, n: number) =>
    pipe(
      C.replicate(n, g),
      C.foldl(constant(C.empty()) as Gen<R, Chunk<A>>, (gen, a) =>
        crossWith_(gen, a, (as, a) => (C.elem_(E)(as, a) ? as : C.append_(as, a)))
      )
    )
}

export function uniqueChunkOfN<A>(E: Eq.Eq<A>): (n: number) => <R>(g: Gen<R, A>) => Gen<R, Chunk<A>> {
  return (n) => (g) => uniqueChunkOfN_(E)(g, n)
}

export function uniqueArrayOfN_<A>(E: Eq.Eq<A>): <R>(g: Gen<R, A>, n: number) => Gen<R, ReadonlyArray<A>> {
  return <R>(g: Gen<R, A>, n: number) => pipe(uniqueChunkOfN_(E)(g, n), map(C.toArray))
}

export function uniqueArrayOfN<A>(E: Eq.Eq<A>): (n: number) => <R>(g: Gen<R, A>) => Gen<R, ReadonlyArray<A>> {
  return (n) => (g) => uniqueArrayOfN_(E)(g, n)
}

export function unfoldGen<S, R, A>(
  s: S,
  f: (s: S) => Gen<R, readonly [S, A]>
): Gen<R & Has<Random> & Has<Sized>, ReadonlyArray<A>> {
  return small((n) => unfoldGenN(n, s, f))
}

export function unfoldGenN<S, R, A>(n: number, s: S, f: (s: S) => Gen<R, readonly [S, A]>): Gen<R, ReadonlyArray<A>> {
  if (n <= 0) {
    return constant(A.empty())
  } else {
    return pipe(
      f(s),
      bind(([s, a]) => pipe(unfoldGenN(n - 1, s, f), map(A.append(a))))
    )
  }
}

export function unwrap<R, R1, A>(effect: I.URIO<R, Gen<R1, A>>): Gen<R & R1, A> {
  return pipe(fromEffect(effect), flatten)
}

export function weighted<R, A>(...gs: ReadonlyArray<readonly [Gen<R, A>, number]>): Gen<R & Has<Random>, A> {
  const sum   = pipe(
    gs,
    A.map(([, w]) => w),
    A.sum
  )
  const [map] = A.foldl_(gs, tuple(new OrderedMap<number, Gen<R, A>>(N.Ord, null), 0), ([map, acc], [gen, d]) => {
    if ((acc + d) / sum > acc / sum) return tuple(OM.insert_(map, (acc + d) / sum, gen), acc + d)
    else return tuple(map, acc)
  })
  return pipe(
    uniform(),
    bind((n) => {
      return pipe(
        map,
        OM.getGte(n),
        O.getOrElse(() => {
          throw new NoSuchElementError('Gen.weighted')
        })
      )
    })
  )
}

export function zipWith_<R, A, R1, B, C>(fa: Gen<R, A>, fb: Gen<R1, B>, f: (a: A, b: B) => C): Gen<R & R1, C> {
  const left: Stream<R, never, E.Either<Sample<R, A>, Sample<R, A>>>     = pipe(
    fa.sample,
    S.map(E.right),
    S.concat(pipe(fa.sample, S.map(E.left))),
    S.forever
  )
  const right: Stream<R1, never, E.Either<Sample<R1, B>, Sample<R1, B>>> = pipe(
    fb.sample,
    S.map(E.right),
    S.concat(pipe(fb.sample, S.map(E.left))),
    S.forever
  )
  return new Gen(
    pipe(
      left,
      S.zipAllWithExec(right, sequential, Th.left, Th.right, Th.both),
      S.collectWhile(
        Th.match(
          () => O.none(),
          () => O.none(),
          (l, r) =>
            E.isRight(l) && E.isRight(r)
              ? O.some(Sa.zipWith_(l.right, r.right, f))
              : E.isRight(l) && E.isLeft(r)
              ? O.some(Sa.zipWith_(l.right, r.left, f))
              : E.isLeft(l) && E.isRight(r)
              ? O.some(Sa.zipWith_(l.left, r.right, f))
              : O.none()
        )
      )
    )
  )
}

export function zipWith<A, R1, B, C>(fb: Gen<R1, B>, f: (a: A, b: B) => C): <R>(fa: Gen<R, A>) => Gen<R & R1, C> {
  return (fa) => zipWith_(fa, fb, f)
}

export { GenURI } from './Modules'
