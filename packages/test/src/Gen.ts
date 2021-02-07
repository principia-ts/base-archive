import type { Has } from '@principia/base/Has'
import type { IO } from '@principia/io/IO'
import type { Random } from '@principia/io/Random'
import type { Stream } from '@principia/io/Stream'

import * as A from '@principia/base/Array'
import { pipe, tuple } from '@principia/base/Function'
import * as Map from '@principia/base/Map'
import * as O from '@principia/base/Option'
import { fromCompare } from '@principia/base/Ord'
import { EQ, GT, LT } from '@principia/base/Ordering'
import { NoSuchElementException } from '@principia/base/util/GlobalExceptions'
import * as I from '@principia/io/IO'
import { nextDouble } from '@principia/io/Random'
import * as S from '@principia/io/Stream'

import { Sample, shrinkNumber } from './Sample'
import * as Sa from './Sample'

export class Gen<R, A> {
  constructor(readonly sample: Stream<R, never, Sample<R, A>>) {}
}

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

export function fromEffectSample<R, A>(effect: IO<R, never, Sample<R, A>>): Gen<R, A> {
  return new Gen(S.fromEffect(effect))
}

export const uniform: Gen<Has<Random>, number> = fromEffectSample(I.map_(nextDouble, (n) => shrinkNumber(0.0, n)))

export const anyDouble: Gen<Has<Random>, number> = fromEffectSample(I.map_(nextDouble, (n) => shrinkNumber(0, n)))

export function constant<A>(a: A): Gen<unknown, A> {
  return new Gen(S.succeed(Sa.noShrink(a)))
}

export function weighted<R, A>(...gs: ReadonlyArray<readonly [Gen<R, A>, number]>): Gen<R & Has<Random>, A> {
  const sum      = pipe(
    gs,
    A.map(([, w]) => w),
    A.sum
  )
  const [map, _] = A.foldl_(gs, tuple(A.empty<readonly [number, Gen<R, A>]>(), 0), ([map, acc], [gen, d]) => {
    if ((acc + d) / sum > acc / sum) return tuple(A.append_(map, tuple((acc + d) / sum, gen)), acc + d)
    else return tuple(map, acc)
  })
  const sorted   = A.sort(
    fromCompare<readonly [number, Gen<R, A>]>((x, y) => (x[0] < y[0] ? GT : x[0] > y[0] ? LT : EQ))
  )(map)
  return pipe(
    uniform,
    bind((n) => {
      return pipe(
        sorted,
        A.dropWhile(([k]) => k < n),
        A.head,
        O.map(([, g]) => g),
        O.getOrElse(() => {
          throw new NoSuchElementException('Gen.weighted')
        })
      )
    })
  )
}
