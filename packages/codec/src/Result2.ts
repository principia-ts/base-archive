import type { Warnings } from './DecodeError'
import type { FSync } from '@principia/base/Sync'

import * as A from '@principia/base/Array'
import { pipe } from '@principia/base/function'
import * as S from '@principia/base/Sync'

export interface Result<E, A> extends FSync<readonly [E, Warnings], readonly [A, Warnings]> {}

export function succeed<E = never, A = never>(a: A, w: Warnings = A.empty()): Result<E, A> {
  return S.succeed([a, w])
}

export function fail<E = never, A = never>(e: E, w: Warnings = A.empty()): Result<E, A> {
  return S.fail([e, w])
}

export function bind_<E, A, E1, B>(ma: Result<E, A>, f: (a: A) => Result<E1, B>): Result<E | E1, B> {
  return pipe(
    ma,
    S.matchM(
      ([e, w]) => fail(e, w),
      ([a, w1]) =>
        S.matchM_(
          f(a),
          ([e, w2]) => fail(e, [...w1, ...w2]),
          ([b, w2]) => succeed(b, [...w1, ...w2])
        )
    )
  )
}

export function bind<A, E1, B>(f: (a: A) => Result<E1, B>): <E>(ma: Result<E, A>) => Result<E | E1, B> {
  return (ma) => bind_(ma, f)
}

export function map_<E, A, B>(fa: Result<E, A>, f: (a: A) => B): Result<E, B> {
  return pipe(
    fa,
    S.matchM(
      ([e, w]) => fail(e, w),
      ([a, w]) => succeed(f(a), w)
    )
  )
}

export function map<A, B>(f: (a: A) => B): <E>(fa: Result<E, A>) => Result<E, B> {
  return (fa) => map_(fa, f)
}

export function mapError_<E, A, E1>(fa: Result<E, A>, f: (e: E) => E1): Result<E1, A> {
  return pipe(
    fa,
    S.matchM(
      ([e, w]) => fail(f(e), w),
      ([a, w]) => succeed(a, w)
    )
  )
}

export function mapError<E, E1>(f: (e: E) => E1): <A>(fa: Result<E, A>) => Result<E1, A> {
  return (fa) => mapError_(fa, f)
}

export function bimap_<E, A, E1, B>(fa: Result<E, A>, f: (e: E) => E1, g: (a: A) => B): Result<E1, B> {
  return S.matchM_(
    fa,
    ([e, w]) => fail(f(e), w),
    ([a, w]) => succeed(g(a), w)
  )
}

export function bimap<E, A, E1, B>(f: (e: E) => E1, g: (a: A) => B): (fa: Result<E, A>) => Result<E1, B> {
  return (fa) => bimap_(fa, f, g)
}