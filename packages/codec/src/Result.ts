import type { Warnings } from './DecodeError'

import * as A from '@principia/base/Array'
import * as E from '@principia/base/Either'
import { pipe } from '@principia/base/function'
import * as S from '@principia/base/Sync'

export interface Result<E, A> extends S.USync<readonly [E.Either<E, A>, Warnings]> {}

export function succeed<E = never, A = never>(a: A, w: Warnings = A.empty()): Result<E, A> {
  return S.succeed([E.Right(a), w])
}

export function fail<E = never, A = never>(e: E, w: Warnings = A.empty()): Result<E, A> {
  return S.succeed([E.Left(e), w])
}

export function result<E, A>(e: E.Either<E, A>, w: Warnings): Result<E, A> {
  return S.succeed([e, w])
}

export function rbind_<E, A, E1, B>(ma: Result<E, A>, f: (a: A) => Result<E1, B>): Result<E | E1, B> {
  return pipe(
    ma,
    S.bind(
      ([e, w]): Result<E | E1, B> =>
        e._tag === 'Left' ? result(e, w) : S.bind_(f(e.right), ([e2, w2]) => result(e2, [...w, ...w2]))
    )
  )
}

export function rbind<A, E1, B>(f: (a: A) => Result<E1, B>): <E>(ma: Result<E, A>) => Result<E | E1, B> {
  return (ma) => rbind_(ma, f)
}

export function rmap_<E, A, B>(fa: Result<E, A>, f: (a: A) => B): Result<E, B> {
  return S.map_(fa, ([e, w]) => [E.map_(e, f), w])
}

export function rmap<A, B>(f: (a: A) => B): <E>(fa: Result<E, A>) => Result<E, B> {
  return (fa) => rmap_(fa, f)
}

export function rmapLeft_<E, A, E1>(fa: Result<E, A>, f: (e: E) => E1): Result<E1, A> {
  return S.map_(fa, ([e, w]) => [E.mapLeft_(e, f), w])
}

export function rmapLeft<E, E1>(f: (e: E) => E1): <A>(fa: Result<E, A>) => Result<E1, A> {
  return (fa) => rmapLeft_(fa, f)
}

export function rbimap_<E, A, E1, B>(fa: Result<E, A>, f: (e: E) => E1, g: (a: A) => B): Result<E1, B> {
  return S.bind_(fa, ([e, w]) => (e._tag === 'Left' ? result(E.mapLeft_(e, f), w) : result(E.map_(e, g), w)))
}

export function rbimap<E, A, E1, B>(f: (e: E) => E1, g: (a: A) => B): (fa: Result<E, A>) => Result<E1, B> {
  return (fa) => rbimap_(fa, f, g)
}
