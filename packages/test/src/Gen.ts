import type { Has } from '@principia/base/Has'
import type { IO } from '@principia/io/IO'
import type { Random } from '@principia/io/Random'
import type { Stream } from '@principia/io/Stream'

import * as A from '@principia/base/Array'
import { identity, pipe, tuple } from '@principia/base/Function'
import * as Map from '@principia/base/Map'
import * as O from '@principia/base/Option'
import { fromCompare, ordNumber } from '@principia/base/Ord'
import { EQ, GT, LT } from '@principia/base/Ordering'
import { RedBlackTree } from '@principia/base/RedBlackTree'
import * as RBT from '@principia/base/RedBlackTree'
import { NoSuchElementException } from '@principia/base/util/GlobalExceptions'
import { IllegalArgumentException } from '@principia/io/Cause'
import * as I from '@principia/io/IO'
import { nextDouble, nextInt, nextIntBetween } from '@principia/io/Random'
import * as S from '@principia/io/Stream'

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

export const uniform: Gen<Has<Random>, number> = fromEffectSample(I.map_(nextDouble, Sa.shrinkFractional(0.0)))

export const anyDouble: Gen<Has<Random>, number> = fromEffectSample(I.map_(nextDouble, shrinkFractional(0)))

export const anyInt: Gen<Has<Random>, number> = fromEffectSample(I.map_(nextInt, Sa.shrinkIntegral(0)))

export const alphaNumericChar: Gen<Has<Random>, string> = weighted(
  [char(48, 57), 10],
  [char(65, 90), 26],
  [char(97, 122), 26]
)

export const exponential: Gen<Has<Random>, number> = map_(uniform, (n) => -Math.log(1 - n))

export const none: Gen<unknown, O.Option<never>> = constant(O.none())

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

export function char(min: number, max: number): Gen<Has<Random>, string> {
  return map_(int(min, max), (n) => String.fromCharCode(n))
}

export function int(min: number, max: number): Gen<Has<Random>, number> {
  return fromEffectSample(
    I.deferTotal(() => {
      if (min > max || min < Number.MIN_SAFE_INTEGER || max > Number.MAX_SAFE_INTEGER) {
        return I.die(new IllegalArgumentException('invalid bounds'))
      } else {
        /*
         * const effect =
         *   max < Number.MAX_SAFE_INTEGER
         *     ? nextIntBetween(min, max + 1)
         *     : min > Number.MIN_SAFE_INTEGER
         *     ? I.map_(nextIntBetween(min - 1, max), (n) => n + 1)
         *     : nextInt
         */
        return I.map_(nextIntBetween(min, max), Sa.shrinkIntegral(min))
      }
    })
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

export function some<R, A>(gen: Gen<R, A>): Gen<R, O.Option<A>> {
  return map_(gen, O.some)
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
  const [map, _] = A.foldl_(
    gs,
    tuple(new RedBlackTree<number, Gen<R, A>>(ordNumber, null), 0),
    ([map, acc], [gen, d]) => {
      if ((acc + d) / sum > acc / sum) return tuple(RBT.insert_(map, (acc + d) / sum, gen), acc + d)
      else return tuple(map, acc)
    }
  )
  return pipe(
    uniform,
    bind((n) => {
      return pipe(
        map,
        RBT.gte(n),
        (it) => it.value,
        O.getOrElse(() => {
          throw new NoSuchElementException('Gen.weighted')
        })
      )
    })
  )
}

function clamp(n: number, min: number, max: number): number {
  return n < min ? min : n > max ? max : n
}
