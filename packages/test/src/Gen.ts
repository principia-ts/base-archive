import type { Has } from '@principia/base/Has'
import type { IO } from '@principia/base/IO'
import type { Predicate } from '@principia/base/Predicate'
import type { Refinement } from '@principia/base/Refinement'
import type { Stream } from '@principia/base/Stream'

import * as A from '@principia/base/Array'
import * as E from '@principia/base/Either'
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
import { tuple } from '@principia/base/tuple'

import { Sample, shrinkFractional } from './Sample'
import * as Sa from './Sample'
import { Sized } from './Sized'

/*
 * -------------------------------------------
 * Model
 * -------------------------------------------
 */

export class Gen<R, A> {
  constructor(readonly sample: Stream<R, never, Sample<R, A>>) {}
}

/*
 * -------------------------------------------
 * Constructors
 * -------------------------------------------
 */

export function fromEffect<R, A>(effect: IO<R, never, A>): Gen<R, A> {
  return new Gen(S.fromEffect(I.map_(effect, Sa.noShrink)))
}

export function fromEffectSample<R, A>(effect: IO<R, never, Sample<R, A>>): Gen<R, A> {
  return new Gen(S.fromEffect(effect))
}

export function constant<A>(a: A): Gen<unknown, A> {
  return new Gen(S.succeed(Sa.noShrink(a)))
}

/*
 * -------------------------------------------
 * Primitives
 * -------------------------------------------
 */

export const uniform: Gen<Has<Random>, number> = fromEffectSample(I.map_(Random.next, Sa.shrinkFractional(0.0)))

export const anyDouble: Gen<Has<Random>, number> = fromEffectSample(I.map_(Random.next, shrinkFractional(0)))

export const anyBigInt: Gen<Has<Random>, bigint> = fromEffectSample(
  I.map_(
    Random.nextBigIntBetween(BigInt(-1) << BigInt(255), (BigInt(1) << BigInt(255)) - BigInt(1)),
    Sa.shrinkBigInt(BigInt(0))
  )
)

export const anyInt: Gen<Has<Random>, number> = fromEffectSample(I.map_(Random.nextInt, Sa.shrinkIntegral(0)))

export const alphaNumericChar: Gen<Has<Random>, string> = weighted(
  [char(48, 57), 10],
  [char(65, 90), 26],
  [char(97, 122), 26]
)

export function alphaNumericStringBounded(min: number, max: number): Gen<Has<Random>, string> {
  return stringBounded(alphaNumericChar, min, max)
}

export const empty: Gen<unknown, never> = new Gen(S.empty)

export const exponential: Gen<Has<Random>, number> = map_(uniform, (n) => -Math.log(1 - n))

export const printableChar = char(33, 126)

export const none: Gen<unknown, O.Option<never>> = constant(O.None())

export const unit: Gen<unknown, void> = constant(undefined)

/*
 * -------------------------------------------
 * Apply
 * -------------------------------------------
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
 * -------------------------------------------
 * Functor
 * -------------------------------------------
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
 * -------------------------------------------
 * Monad
 * -------------------------------------------
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
 * -------------------------------------------
 * Filterable
 * -------------------------------------------
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
 * -------------------------------------------
 * Combinators
 * -------------------------------------------
 */

export function arrayOfN_<R, A>(g: Gen<R, A>, n: number): Gen<R, ReadonlyArray<A>> {
  return pipe(
    A.replicate(n, g),
    A.foldl(constant(A.empty()) as Gen<R, ReadonlyArray<A>>, (gen, a) => crossWith_(gen, a, A.append_))
  )
}

export function arrayOfN(n: number): <R, A>(g: Gen<R, A>) => Gen<R, ReadonlyArray<A>> {
  return (g) => arrayOfN_(g, n)
}

export function arrayOf<R, A>(g: Gen<R, A>): Gen<R & Has<Random> & Has<Sized>, ReadonlyArray<A>> {
  return small((n) => arrayOfN_(g, n))
}

export function bounded<R, A>(min: number, max: number, f: (n: number) => Gen<R, A>): Gen<R & Has<Random>, A> {
  return bind_(int(min, max), f)
}

export function char(min: number, max: number): Gen<Has<Random>, string> {
  return map_(int(min, max), (n) => String.fromCharCode(n))
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

export function option<R, A>(gen: Gen<R, A>): Gen<R & Has<Random>, O.Option<A>> {
  return oneOf(none, some(gen))
}

export function oneOf<R, A>(...gens: ReadonlyArray<Gen<R, A>>): Gen<R & Has<Random>, A> {
  if (A.isEmpty(gens)) return empty
  else return bind_(int(0, gens.length - 1), (i) => gens[i])
}

/**
 * A sized generator that uses an exponential distribution of size values.
 * The majority of sizes will be towards the lower end of the range but some
 * larger sizes will be generated as well.
 */
export function medium<R, A>(f: (n: number) => Gen<R, A>, min = 0): Gen<R & Has<Random> & Has<Sized>, A> {
  return pipe(
    size,
    bind((max) => map_(exponential, (n) => clamp(Math.round((n * max) / 10.0), min, max))),
    reshrink(Sa.shrinkIntegral(min)),
    bind(f)
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
    bind((max) => map_(exponential, (n) => clamp(Math.round((n * max) / 25), min, max))),
    reshrink(Sa.shrinkIntegral(min)),
    bind(f)
  )
}

export function string<R>(char: Gen<R, string>): Gen<R & Has<Random> & Has<Sized>, string> {
  return map_(arrayOf(char), A.join(''))
}

export function stringBounded<R>(char: Gen<R, string>, min: number, max: number): Gen<R & Has<Random>, string> {
  return bounded(min, max, (n) => stringN(char, n))
}

export function stringN<R>(char: Gen<R, string>, n: number): Gen<R, string> {
  return map_(arrayOfN_(char, n), A.join(''))
}

export function some<R, A>(gen: Gen<R, A>): Gen<R, O.Option<A>> {
  return map_(gen, O.Some)
}

export function defer<R, A>(gen: () => Gen<R, A>): Gen<R, A> {
  return pipe(I.effectTotal(gen), fromEffect, flatten)
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

export function weighted<R, A>(...gs: ReadonlyArray<readonly [Gen<R, A>, number]>): Gen<R & Has<Random>, A> {
  const sum      = pipe(
    gs,
    A.map(([, w]) => w),
    A.sum
  )
  const [map, _] = A.foldl_(gs, tuple(new OrderedMap<number, Gen<R, A>>(N.Ord, null), 0), ([map, acc], [gen, d]) => {
    if ((acc + d) / sum > acc / sum) return tuple(OM.insert_(map, (acc + d) / sum, gen), acc + d)
    else return tuple(map, acc)
  })
  return pipe(
    uniform,
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
    S.map(E.Right),
    S.concat(pipe(fa.sample, S.map(E.Left))),
    S.forever
  )
  const right: Stream<R1, never, E.Either<Sample<R1, B>, Sample<R1, B>>> = pipe(
    fb.sample,
    S.map(E.Right),
    S.concat(pipe(fb.sample, S.map(E.Left))),
    S.forever
  )
  return new Gen(
    pipe(
      left,
      S.zipAllWithExec(
        right,
        sequential,
        (l) => tuple(O.Some(l), O.None()),
        (r) => tuple(O.None(), O.Some(r)),
        (l, r) => tuple(O.Some(l), O.Some(r))
      ),
      S.collectWhile(([x, y]) =>
        O.isSome(x) && O.isSome(y)
          ? E.isRight(x.value) && E.isRight(y.value)
            ? O.Some(Sa.zipWith_(x.value.right, y.value.right, f))
            : E.isRight(x.value) && E.isLeft(y.value)
            ? O.Some(Sa.zipWith_(x.value.right, y.value.left, f))
            : E.isLeft(x.value) && E.isRight(y.value)
            ? O.Some(Sa.zipWith_(x.value.left, y.value.right, f))
            : O.None()
          : O.None()
      )
    )
  )
}

export function zipWith<A, R1, B, C>(fb: Gen<R1, B>, f: (a: A, b: B) => C): <R>(fa: Gen<R, A>) => Gen<R & R1, C> {
  return (fa) => zipWith_(fa, fb, f)
}

function clamp(n: number, min: number, max: number): number {
  return n < min ? min : n > max ? max : n
}

export const alphaNumericString: Gen<Has<Random> & Has<Sized>, string> = string(alphaNumericChar)
