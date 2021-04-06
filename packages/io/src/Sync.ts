import type { SyncURI } from './Modules'
import type { Multi } from './Multi'
import type { Has, Region, Tag } from '@principia/base/Has'
import type * as HKT from '@principia/base/HKT'
import type { _E, _R, UnionToIntersection } from '@principia/base/util/types'

import * as A from '@principia/base/Array'
import * as E from '@principia/base/Either'
import { NoSuchElementError } from '@principia/base/Error'
import { flow, identity, pipe } from '@principia/base/function'
import { isTag, mergeEnvironments, tag } from '@principia/base/Has'
import * as I from '@principia/base/Iterable'
import * as O from '@principia/base/Option'
import * as R from '@principia/base/Record'
import * as P from '@principia/base/typeclass'
import { makeMonoid } from '@principia/base/typeclass'
import * as FL from '@principia/free/FreeList'

import * as M from './Multi'

/*
 * -------------------------------------------
 * Model
 * -------------------------------------------
 */

export interface Sync<R, E, A> extends Multi<never, unknown, never, R, E, A> {}

export function isSync(u: unknown): u is Sync<any, any, any> {
  return typeof u === 'object' && u != null && '_U' in u && u['_U'] === 'Multi'
}

export type USync<A> = Sync<unknown, never, A>
export type FSync<E, A> = Sync<unknown, E, A>
export type URSync<R, A> = Sync<R, never, A>

export type V = HKT.V<'R', '-'> & HKT.V<'E', '+'>
type URI = [HKT.URI<typeof SyncURI>]

/*
 * -------------------------------------------
 * Constructors
 * -------------------------------------------
 */

export const succeed: <A>(a: A) => Sync<unknown, never, A> = M.succeed

export const fail: <E>(e: E) => Sync<unknown, E, never> = M.fail

export const effect: <A>(effect: () => A) => Sync<unknown, unknown, A> = M.effect

export const effectTotal: <A>(effect: () => A) => Sync<unknown, never, A> = M.effectTotal

export const effectCatch_: <E, A>(effect: () => A, onThrow: (error: unknown) => E) => Sync<unknown, E, A> =
  M.effectCatch_

export const effectCatch: <E>(onThrow: (error: unknown) => E) => <A>(effect: () => A) => Sync<unknown, E, A> =
  M.effectCatch

export const defer: <R, E, A>(effect: () => Sync<R, E, A>) => Sync<R, unknown, A> = M.defer

export const deferTotal: <R, E, A>(effect: () => Sync<R, E, A>) => Sync<R, E, A> = M.deferTotal

export const deferCatch_: <R, E, A, E1>(
  effect: () => Sync<R, E, A>,
  onThrow: (u: unknown) => E1
) => Sync<R, E | E1, A> = M.deferCatch_

export const deferCatch: <E1>(
  onThrow: (u: unknown) => E1
) => <R, E, A>(sync: () => Sync<R, E, A>) => Sync<R, E | E1, A> = M.deferCatch

export const fromEither: <E, A>(either: E.Either<E, A>) => Sync<unknown, E, A> = E.match(fail, succeed)

export const fromOption = <E, A>(option: O.Option<A>, onNone: () => E): Sync<unknown, E, A> =>
  O.match_(option, () => fail(onNone()), succeed)

/*
 * -------------------------------------------
 * Folds
 * -------------------------------------------
 */

/**
 * Recovers from errors by accepting one computation to execute for the case
 * of an error, and one computation to execute for the case of success.
 *
 * @category Combinators
 * @since 1.0.0
 */
export const matchM_: <R, E, A, R1, E1, B, R2, E2, C>(
  fa: Sync<R, E, A>,
  onFailure: (e: E) => Sync<R1, E1, B>,
  onSuccess: (a: A) => Sync<R2, E2, C>
) => Sync<R & R1 & R2, E1 | E2, B | C> = M.matchM_

/**
 * Recovers from errors by accepting one computation to execute for the case
 * of an error, and one computation to execute for the case of success.
 *
 * @category Combinators
 * @since 1.0.0
 */
export const matchM: <E, A, R1, E1, B, R2, E2, C>(
  onFailure: (e: E) => Sync<R1, E1, B>,
  onSuccess: (a: A) => Sync<R2, E2, C>
) => <R>(fa: Sync<R, E, A>) => Sync<R & R1 & R2, E1 | E2, B | C> = M.matchM

/**
 * Folds over the failed or successful results of this computation to yield
 * a computation that does not fail, but succeeds with the value of the left
 * or right function passed to `match`.
 *
 * @category Combinators
 * @since 1.0.0
 */
export const match_: <R, E, A, B, C>(
  fa: Sync<R, E, A>,
  onFailure: (e: E) => B,
  onSuccess: (a: A) => C
) => Sync<R, never, B | C> = M.match_

/**
 * Folds over the failed or successful results of this computation to yield
 * a computation that does not fail, but succeeds with the value of the left
 * or right function passed to `match`.
 *
 * @category Combinators
 * @since 1.0.0
 */
export const match: <E, A, B, C>(
  onFailure: (e: E) => B,
  onSuccess: (a: A) => C
) => <R>(fa: Sync<R, E, A>) => Sync<R, never, B | C> = M.match

/**
 * Recovers from all errors
 *
 * @category Combinators
 * @since 1.0.0
 */
export const catchAll_: <R, E, A, R1, E1, B>(
  fa: Sync<R, E, A>,
  onFailure: (e: E) => Sync<R1, E1, B>
) => Sync<R1 & R, E1, A | B> = M.catchAll_

/**
 * Recovers from all errors
 *
 * @category Combinators
 * @since 1.0.0
 */
export const catchAll: <E, R1, E1, B>(
  onFailure: (e: E) => Sync<R1, E1, B>
) => <R, A>(fa: Sync<R, E, A>) => Sync<R1 & R, E1, A | B> = M.catchAll

export const catchSome_: <R, E, A, R1, E1, B>(
  fa: Sync<R, E, A>,
  onFailure: (e: E) => O.Option<Sync<R1, E1, B>>
) => Sync<R1 & R, E | E1, A | B> = M.catchSome_

export const catchSome: <E, R1, E1, B>(
  onFailure: (e: E) => O.Option<Sync<R1, E1, B>>
) => <R, A>(fa: Sync<R, E, A>) => Sync<R1 & R, E | E1, A | B> = M.catchSome

/**
 * Effectfully matches two `Sync` computations together
 *
 * @category Combinators
 * @since 1.0.0
 */
export function matchTogetherM_<R, E, A, R1, E1, B, R2, E2, C, R3, E3, D, R4, E4, F, R5, E5, G>(
  left: Sync<R, E, A>,
  right: Sync<R1, E1, B>,
  onBothFailure: (e: E, e1: E1) => Sync<R2, E2, C>,
  onRightFailure: (a: A, e1: E1) => Sync<R3, E3, D>,
  onLeftFailure: (b: B, e: E) => Sync<R4, E4, F>,
  onBothSuccess: (a: A, b: B) => Sync<R5, E5, G>
): Sync<R & R1 & R2 & R3 & R4 & R5, E2 | E3 | E4 | E5, C | D | F | G> {
  return pipe(
    cross_(attempt(left), attempt(right)),
    bind(
      ([ea, eb]): Sync<R & R1 & R2 & R3 & R4 & R5, E2 | E3 | E4 | E5, C | D | F | G> => {
        switch (ea._tag) {
          case 'Left': {
            switch (eb._tag) {
              case 'Left': {
                return onBothFailure(ea.left, eb.left)
              }
              case 'Right': {
                return onLeftFailure(eb.right, ea.left)
              }
            }
          }
          // eslint-disable-next-line no-fallthrough
          case 'Right': {
            switch (eb._tag) {
              case 'Left': {
                return onRightFailure(ea.right, eb.left)
              }
              case 'Right': {
                return onBothSuccess(ea.right, eb.right)
              }
            }
          }
        }
      }
    )
  )
}

/**
 * Effectfully matches two `Sync` computations together
 *
 * @category Combinators
 * @since 1.0.0
 */
export function matchTogetherM<E, A, R1, E1, B, R2, E2, C, R3, E3, D, R4, E4, F, R5, E5, G>(
  right: Sync<R1, E1, B>,
  onBothFailure: (e: E, e1: E1) => Sync<R2, E2, C>,
  onRightFailure: (a: A, e1: E1) => Sync<R3, E3, D>,
  onLeftFailure: (b: B, e: E) => Sync<R4, E4, F>,
  onBothSuccess: (a: A, b: B) => Sync<R5, E5, G>
): <R>(left: Sync<R, E, A>) => Sync<R & R1 & R2 & R3 & R4 & R5, E2 | E3 | E4 | E5, C | D | F | G> {
  return (left) => matchTogetherM_(left, right, onBothFailure, onRightFailure, onLeftFailure, onBothSuccess)
}

/**
 * Folds two `Sync` computations together
 *
 * @category Combinators
 * @since 1.0.0
 */
export function matchTogether_<R, E, A, R1, E1, B, C, D, F, G>(
  left: Sync<R, E, A>,
  right: Sync<R1, E1, B>,
  onBothFailure: (e: E, e1: E1) => C,
  onRightFailure: (a: A, e1: E1) => D,
  onLeftFailure: (b: B, e: E) => F,
  onBothSuccess: (a: A, b: B) => G
): Sync<R & R1, never, C | D | F | G> {
  return matchTogetherM_(
    left,
    right,
    flow(onBothFailure, succeed),
    flow(onRightFailure, succeed),
    flow(onLeftFailure, succeed),
    flow(onBothSuccess, succeed)
  )
}

/**
 * Folds two `Sync` computations together
 *
 * @category Combinators
 * @since 1.0.0
 */
export function matchTogether<E, A, R1, E1, B, C, D, F, G>(
  right: Sync<R1, E1, B>,
  onBothFailure: (e: E, e1: E1) => C,
  onRightFailure: (a: A, e1: E1) => D,
  onLeftFailure: (b: B, e: E) => F,
  onBothSuccess: (a: A, b: B) => G
): <R>(left: Sync<R, E, A>) => Sync<R & R1, never, C | D | F | G> {
  return (left) => matchTogether_(left, right, onBothFailure, onRightFailure, onLeftFailure, onBothSuccess)
}

/*
 * -------------------------------------------
 * Alt
 * -------------------------------------------
 */

export const alt_: <R, E, A, R1, E1, A1>(
  fa: Sync<R, E, A>,
  fb: () => Sync<R1, E1, A1>
) => Sync<R & R1, E | E1, A | A1> = M.alt_

export const alt: <R1, E1, A1>(
  fb: () => Sync<R1, E1, A1>
) => <R, E, A>(fa: Sync<R, E, A>) => Sync<R & R1, E | E1, A | A1> = M.alt

/*
 * -------------------------------------------
 * Applicative
 * -------------------------------------------
 */

export const pure: <A>(a: A) => Sync<unknown, never, A> = M.pure

/*
 * -------------------------------------------
 * Apply
 * -------------------------------------------
 */

export const cross_: <R, E, A, Q, D, B>(fa: Sync<R, E, A>, fb: Sync<Q, D, B>) => Sync<Q & R, D | E, readonly [A, B]> =
  M.cross_

export const cross: <Q, D, B>(
  fb: Sync<Q, D, B>
) => <R, E, A>(fa: Sync<R, E, A>) => Sync<Q & R, D | E, readonly [A, B]> = M.cross

export const crossWith_: <R, E, A, Q, D, B, C>(
  fa: Sync<R, E, A>,
  fb: Sync<Q, D, B>,
  f: (a: A, b: B) => C
) => Sync<Q & R, D | E, C> = M.crossWith_

export const crossWith: <A, Q, D, B, C>(
  fb: Sync<Q, D, B>,
  f: (a: A, b: B) => C
) => <R, E>(fa: Sync<R, E, A>) => Sync<Q & R, D | E, C> = M.crossWith

export const ap_: <R, E, A, Q, D, B>(fab: Sync<R, E, (a: A) => B>, fa: Sync<Q, D, A>) => Sync<Q & R, D | E, B> = M.ap_

export const ap: <Q, D, A>(fa: Sync<Q, D, A>) => <R, E, B>(fab: Sync<R, E, (a: A) => B>) => Sync<Q & R, D | E, B> = M.ap

export const apl_: <R, E, A, R1, E1, B>(fa: Sync<R, E, A>, fb: Sync<R1, E1, B>) => Sync<R & R1, E | E1, A> = M.apl_

export const apl: <R1, E1, B>(fb: Sync<R1, E1, B>) => <R, E, A>(fa: Sync<R, E, A>) => Sync<R & R1, E | E1, A> = M.apl

export const apr_: <R, E, A, R1, E1, B>(fa: Sync<R, E, A>, fb: Sync<R1, E1, B>) => Sync<R & R1, E | E1, B> = M.apr_

export const apr: <R1, E1, B>(fb: Sync<R1, E1, B>) => <R, E, A>(fa: Sync<R, E, A>) => Sync<R & R1, E | E1, B> = M.apr

export function liftA2_<A, B, C>(f: (a: A, b: B) => C): (a: USync<A>, b: USync<B>) => USync<C> {
  return (a, b) => crossWith_(a, b, f)
}

export function liftA2<A, B, C>(f: (a: A) => (b: B) => C): (a: USync<A>) => (b: USync<B>) => USync<C> {
  return (a) => (b) => crossWith_(a, b, (a, b) => f(a)(b))
}

export function liftK<A extends [unknown, ...ReadonlyArray<unknown>], B>(
  f: (...args: A) => B
): (...args: { [K in keyof A]: USync<A[K]> }) => USync<B> {
  return (...args) => map_(sequenceT(...(args as any)), (a) => f(...(a as any))) as any
}

/*
 * -------------------------------------------
 * Bifunctor
 * -------------------------------------------
 */

export const bimap_: <R, E, A, B, C>(pab: Sync<R, E, A>, f: (e: E) => B, g: (a: A) => C) => Sync<R, B, C> = M.bimap_

export const bimap: <E, A, B, C>(f: (e: E) => B, g: (a: A) => C) => <R>(pab: Sync<R, E, A>) => Sync<R, B, C> = M.bimap

export const mapError_: <R, E, A, B>(pab: Sync<R, E, A>, f: (e: E) => B) => Sync<R, B, A> = M.mapError_

export const mapError: <E, B>(f: (e: E) => B) => <R, A>(pab: Sync<R, E, A>) => Sync<R, B, A> = M.mapError

/*
 * -------------------------------------------
 * Fallible
 * -------------------------------------------
 */

export const attempt: <R, E, A>(fa: Sync<R, E, A>) => Sync<R, never, E.Either<E, A>> = M.attempt

export const absolve: <R, E, E1, A>(fa: Sync<R, E1, E.Either<E, A>>) => Sync<R, E | E1, A> = M.refail

/*
 * -------------------------------------------
 * Functor
 * -------------------------------------------
 */

export const map_: <R, E, A, B>(fa: Sync<R, E, A>, f: (a: A) => B) => Sync<R, E, B> = M.map_

export const map: <A, B>(f: (a: A) => B) => <R, E>(fa: Sync<R, E, A>) => Sync<R, E, B> = M.map

/*
 * -------------------------------------------
 * Monad
 * -------------------------------------------
 */

export const bind_: <R, E, A, Q, D, B>(ma: Sync<R, E, A>, f: (a: A) => Sync<Q, D, B>) => Sync<Q & R, D | E, B> = M.bind_

export const bind: <A, Q, D, B>(f: (a: A) => Sync<Q, D, B>) => <R, E>(ma: Sync<R, E, A>) => Sync<Q & R, D | E, B> =
  M.bind

export const flatten: <R, E, R1, E1, A>(mma: Sync<R, E, Sync<R1, E1, A>>) => Sync<R & R1, E | E1, A> = bind(identity)

export const tap_: <R, E, A, Q, D, B>(ma: Sync<R, E, A>, f: (a: A) => Sync<Q, D, B>) => Sync<Q & R, D | E, A> = M.tap_

export const tap: <A, Q, D, B>(f: (a: A) => Sync<Q, D, B>) => <R, E>(ma: Sync<R, E, A>) => Sync<Q & R, D | E, A> = M.tap

/*
 * -------------------------------------------
 * Monoid
 * -------------------------------------------
 */

export function getUnfailableMonoid<M>(M: P.Monoid<M>): P.Monoid<USync<M>> {
  return {
    ...getUnfailableSemigroup(M),
    nat: succeed(M.nat)
  }
}

export function getFailableMonoid<E, A>(MA: P.Monoid<A>, ME: P.Monoid<E>): P.Monoid<FSync<E, A>> {
  return {
    ...getFailableSemigroup(MA, ME),
    nat: succeed(MA.nat)
  }
}

/*
 * -------------------------------------------
 * Reader
 * -------------------------------------------
 */

export const ask: <R>() => Sync<R, never, R> = M.ask

export const asksM: <R0, R, E, A>(f: (r0: R0) => Sync<R, E, A>) => Sync<R0 & R, E, A> = M.asksM

export const asks: <R0, A>(f: (r0: R0) => A) => Sync<R0, never, A> = M.asks

export const gives_: <R0, R, E, A>(ra: Sync<R, E, A>, f: (r0: R0) => R) => Sync<R0, E, A> = M.gives_

export const gives: <R0, R>(f: (r0: R0) => R) => <E, A>(ra: Sync<R, E, A>) => Sync<R0, E, A> = M.gives

export const giveAll_: <R, E, A>(ra: Sync<R, E, A>, env: R) => Sync<unknown, E, A> = M.giveAll_

export const giveAll: <R>(env: R) => <E, A>(ra: Sync<R, E, A>) => Sync<unknown, E, A> = M.giveAll

export const give_: <R0, R, E, A>(ra: Sync<R & R0, E, A>, env: R) => Sync<R0, E, A> = M.give_

export const give: <R>(env: R) => <R0, E, A>(ra: Sync<R & R0, E, A>) => Sync<R0, E, A> = M.give

/*
 * -------------------------------------------
 * Semigroup
 * -------------------------------------------
 */

export function getUnfailableSemigroup<S>(S: P.Semigroup<S>): P.Semigroup<USync<S>> {
  return P.makeSemigroup(liftA2_(S.combine_))
}

export function getFailableSemigroup<E, A>(SA: P.Semigroup<A>, SE: P.Semigroup<E>): P.Semigroup<FSync<E, A>> {
  return P.makeSemigroup((x, y) =>
    matchTogetherM_(
      x,
      y,
      (e, e1) => fail(SE.combine_(e, e1)),
      (_, e1) => fail(e1),
      (_, e) => fail(e),
      (a, b) => succeed(SA.combine_(a, b))
    )
  )
}

/*
 * -------------------------------------------
 * Unit
 * -------------------------------------------
 */

export const unit: () => Sync<unknown, never, void> = M.unit

/*
 * -------------------------------------------
 * Service
 * -------------------------------------------
 */

/**
 * Access a record of services with the required Service Entries
 */
export function asksServicesM<SS extends Record<string, Tag<any>>>(
  s: SS
): <R = unknown, E = never, B = unknown>(
  f: (a: { [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? T : unknown }) => Sync<R, E, B>
) => Sync<
  R & UnionToIntersection<{ [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? Has<T> : unknown }[keyof SS]>,
  E,
  B
> {
  return (f) =>
    M.asksM(
      (
        r: UnionToIntersection<
          {
            [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? Has<T> : unknown
          }[keyof SS]
        >
      ) => f(R.map_(s, (v) => r[v.key]) as any)
    )
}

export function asksServicesTM<SS extends Tag<any>[]>(
  ...s: SS
): <R = unknown, E = never, B = unknown>(
  f: (...a: { [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? T : unknown }) => Sync<R, E, B>
) => Sync<
  R & UnionToIntersection<{ [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? Has<T> : never }[keyof SS & number]>,
  E,
  B
> {
  return (f) =>
    M.asksM(
      (
        r: UnionToIntersection<
          {
            [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? Has<T> : never
          }[keyof SS & number]
        >
      ) => f(...(A.map_(s, (v) => r[v.key]) as any))
    )
}

export function asksServicesT<SS extends Tag<any>[]>(
  ...s: SS
): <B = unknown>(
  f: (...a: { [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? T : unknown }) => B
) => Sync<
  UnionToIntersection<{ [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? Has<T> : never }[keyof SS & number]>,
  never,
  B
> {
  return (f) =>
    M.asks(
      (
        r: UnionToIntersection<
          {
            [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? Has<T> : never
          }[keyof SS & number]
        >
      ) => f(...(A.map_(s, (v) => r[v.key]) as any))
    )
}

/**
 * Access a record of services with the required Service Entries
 */
export function asksServices<SS extends Record<string, Tag<any>>>(
  s: SS
): <B>(
  f: (a: { [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? T : unknown }) => B
) => Sync<
  UnionToIntersection<{ [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? Has<T> : unknown }[keyof SS]>,
  never,
  B
> {
  return (f) =>
    M.asks((r: UnionToIntersection<{ [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? Has<T> : unknown }[keyof SS]>) =>
      f(R.map_(s, (v) => r[v.key]) as any)
    )
}

/**
 * Access a service with the required Service Entry
 */
export function asksServiceM<T>(s: Tag<T>): <R, E, B>(f: (a: T) => Sync<R, E, B>) => Sync<R & Has<T>, E, B> {
  return (f) => M.asksM((r: Has<T>) => f(r[s.key as any]))
}

/**
 * Access a service with the required Service Entry
 */
export function asksService<T>(s: Tag<T>): <B>(f: (a: T) => B) => Sync<Has<T>, never, B> {
  return (f) => asksServiceM(s)((a) => M.pure(f(a)))
}

/**
 * Access a service with the required Service Entry
 */
export function askService<T>(s: Tag<T>): Sync<Has<T>, never, T> {
  return asksServiceM(s)((a) => M.pure(a))
}

/**
 * Provides the service with the required Service Entry
 */
export function giveServiceM<T>(
  _: Tag<T>
): <R, E>(f: Sync<R, E, T>) => <R1, E1, A1>(ma: Sync<R1 & Has<T>, E1, A1>) => Sync<R & R1, E | E1, A1> {
  return <R, E>(f: Sync<R, E, T>) => <R1, E1, A1>(ma: Sync<R1 & Has<T>, E1, A1>): Sync<R & R1, E | E1, A1> =>
    M.asksM((r: R & R1) => M.bind_(f, (t) => M.giveAll_(ma, mergeEnvironments(_, r, t))))
}

/**
 * Provides the service with the required Service Entry
 */
export function giveService<T>(_: Tag<T>): (f: T) => <R1, E1, A1>(ma: Sync<R1 & Has<T>, E1, A1>) => Sync<R1, E1, A1> {
  return (f) => (ma) => giveServiceM(_)(M.pure(f))(ma)
}

/**
 * Replaces the service with the required Service Entry
 */
export function updateServiceM<R, E, T>(
  _: Tag<T>,
  f: (_: T) => Sync<R, E, T>
): <R1, E1, A1>(ma: Sync<R1 & Has<T>, E1, A1>) => Sync<R & R1 & Has<T>, E | E1, A1> {
  return (ma) => asksServiceM(_)((t) => giveServiceM(_)(f(t))(ma))
}

/**
 * Replaces the service with the required Service Entry
 */
export function updateServiceM_<R, E, T, R1, E1, A1>(
  ma: Sync<R1 & Has<T>, E1, A1>,
  _: Tag<T>,
  f: (_: T) => Sync<R, E, T>
): Sync<R & R1 & Has<T>, E | E1, A1> {
  return asksServiceM(_)((t) => giveServiceM(_)(f(t))(ma))
}

/**
 * Replaces the service with the required Service Entry
 */
export function updateService<T>(
  _: Tag<T>,
  f: (_: T) => T
): <R1, E1, A1>(ma: Sync<R1 & Has<T>, E1, A1>) => Sync<R1 & Has<T>, E1, A1> {
  return (ma) => asksServiceM(_)((t) => giveServiceM(_)(M.pure(f(t)))(ma))
}

/**
 * Replaces the service with the required Service Entry
 */
export function updateService_<R1, E1, A1, T>(
  ma: Sync<R1 & Has<T>, E1, A1>,
  _: Tag<T>,
  f: (_: T) => T
): Sync<R1 & Has<T>, E1, A1> {
  return asksServiceM(_)((t) => giveServiceM(_)(M.pure(f(t)))(ma))
}

/**
 * Maps the success value of this effect to a service.
 */
export function asService<A>(has: Tag<A>): <R, E>(fa: Sync<R, E, A>) => Sync<R, E, Has<A>> {
  return (fa) => M.map_(fa, has.of)
}

/*
 * -------------------------------------------
 * Run
 * -------------------------------------------
 */

export const runEither: <E, A>(sync: Sync<unknown, E, A>) => E.Either<E, A> = M.runEither

export const runEitherEnv_: <R, E, A>(sync: Sync<R, E, A>, env: R) => E.Either<E, A> = M.runEitherEnv_

export const runEitherEnv: <R>(env: R) => <E, A>(sync: Sync<R, E, A>) => E.Either<E, A> = M.runEitherEnv

export const run: <A>(sync: Sync<unknown, never, A>) => A = M.runResult

/*
 * -------------------------------------------
 * Combinators
 * -------------------------------------------
 */

function MonoidBindUnit<R, E>(): P.Monoid<Sync<R, E, void>> {
  return makeMonoid<Sync<R, E, void>>((x, y) => bind_(x, () => y), unit())
}

export function iforeachUnit_<A, R, E>(as: Iterable<A>, f: (i: number, a: A) => Sync<R, E, void>): Sync<R, E, void> {
  return I.ifoldMap_(MonoidBindUnit<R, E>())(as, f)
}

export function iforeachUnit<A, R, E>(f: (i: number, a: A) => Sync<R, E, void>): (as: Iterable<A>) => Sync<R, E, void> {
  return (as) => iforeachUnit_(as, f)
}

export function iforeachArrayUnit_<A, R, E>(
  as: ReadonlyArray<A>,
  f: (i: number, a: A) => Sync<R, E, void>
): Sync<R, E, void> {
  return A.ifoldMap_(MonoidBindUnit<R, E>())(as, f)
}

export function iforeachArrayUnit<A, R, E>(
  f: (i: number, a: A) => Sync<R, E, void>
): (as: ReadonlyArray<A>) => Sync<R, E, void> {
  return (as) => iforeachArrayUnit_(as, f)
}

export function iforeach_<A, R, E, B>(
  as: Iterable<A>,
  f: (i: number, a: A) => Sync<R, E, B>
): Sync<R, E, ReadonlyArray<B>> {
  return I.ifoldl_(as, succeed([]) as Sync<R, E, Array<B>>, (b, i, a) =>
    crossWith_(
      b,
      deferTotal(() => f(i, a)),
      (acc, r) => {
        acc.push(r)
        return acc
      }
    )
  )
}

export function iforeach<A, R, E, B>(
  f: (i: number, a: A) => Sync<R, E, B>
): (as: Iterable<A>) => Sync<R, E, ReadonlyArray<B>> {
  return (as) => iforeach_(as, f)
}

export function foreach_<A, R, E, B>(as: Iterable<A>, f: (a: A) => Sync<R, E, B>): Sync<R, E, ReadonlyArray<B>> {
  return iforeach_(as, (_, a) => f(a))
}

export function foreach<A, R, E, B>(f: (a: A) => Sync<R, E, B>): (as: Iterable<A>) => Sync<R, E, ReadonlyArray<B>> {
  return (as) => foreach_(as, f)
}

export function collectAll<R, E, A>(as: ReadonlyArray<Sync<R, E, A>>): Sync<R, E, ReadonlyArray<A>> {
  return foreach_(as, identity)
}

/*
 * -------------------------------------------
 * Instances
 * -------------------------------------------
 */

export const Alt = P.Alt<URI, V>({
  map_,
  alt_
})

export const Functor = P.Functor<URI, V>({
  map_
})

export const Bifunctor = P.Bifunctor<URI, V>({
  mapLeft_: mapError_,
  mapRight_: map_,
  bimap_
})

export const SemimonoidalFunctor = P.SemimonoidalFunctor<URI, V>({
  map_,
  crossWith_,
  cross_
})

export const sequenceT = P.sequenceTF(SemimonoidalFunctor)
export const sequenceS = P.sequenceSF(SemimonoidalFunctor)

export const Apply = P.Apply<URI, V>({
  map_,
  crossWith_,
  cross_,
  ap_
})

export const MonoidalFunctor = P.MonoidalFunctor<URI, V>({
  map_,
  crossWith_,
  cross_,
  unit
})

export const Applicative = P.Applicative<URI, V>({
  map_,
  crossWith_,
  cross_,
  ap_,
  unit,
  pure
})

export const Monad = P.Monad<URI, V>({
  map_,
  cross_,
  crossWith_,
  ap_,
  unit,
  pure,
  bind_,
  flatten
})

export const MonadExcept = P.MonadExcept<URI, V>({
  map_,
  cross_,
  crossWith_,
  ap_,
  unit,
  pure,
  bind_,
  flatten,
  catchAll_,
  fail
})

/*
 * -------------------------------------------
 * Do
 * -------------------------------------------
 */

export const DoSync = P.deriveDo(Monad)

const of: Sync<unknown, never, {}> = succeed({})
export { of as do }

export const letS: <K, N extends string, A>(
  name: Exclude<N, keyof K>,
  f: (_: K) => A
) => <R, E>(
  mk: Sync<R, E, K>
) => Sync<
  R,
  E,
  {
    [k in N | keyof K]: k extends keyof K ? K[k] : A
  }
> = P.letSF(Monad)

export const bindS: <R, E, A, K, N extends string>(
  name: Exclude<N, keyof K>,
  f: (_: K) => Sync<R, E, A>
) => <R2, E2>(
  mk: Sync<R2, E2, K>
) => Sync<
  R & R2,
  E | E2,
  {
    [k in N | keyof K]: k extends keyof K ? K[k] : A
  }
> = P.bindSF(Monad)

export const bindToS: <K, N extends string>(
  name: Exclude<N, keyof K>
) => <R, E, A>(fa: Sync<R, E, A>) => Sync<R, E, { [k in Exclude<N, keyof K>]: A }> = P.bindToSF(Monad)

/*
 * -------------------------------------------
 * Gen
 * -------------------------------------------
 */

export class GenSync<R, E, A> {
  readonly _R!: (_: R) => void
  readonly _E!: () => E
  readonly _A!: () => A

  constructor(readonly S: Sync<R, E, A>) {}

  *[Symbol.iterator](): Generator<GenSync<R, E, A>, A, any> {
    return yield this
  }
}

const adapter = (_: any, __?: any) => {
  if (E.isEither(_)) {
    return new GenSync(fromEither(_))
  }
  if (O.isOption(_)) {
    return new GenSync(fromOption(_, () => (__ ? __() : new NoSuchElementError('Sync.gen'))))
  }
  if (isTag(_)) {
    return new GenSync(asksService(_)(identity))
  }
  return new GenSync(_)
}

export function gen<R0, E0, A0>(): <T extends GenSync<R0, E0, any>>(
  f: (i: {
    <A>(_: Tag<A>): GenSync<Has<A>, never, A>
    <E, A>(_: O.Option<A>, onNone: () => E): GenSync<unknown, E, A>
    <A>(_: O.Option<A>): GenSync<unknown, NoSuchElementError, A>
    <E, A>(_: E.Either<E, A>): GenSync<unknown, E, A>
    <R, E, A>(_: Sync<R, E, A>): GenSync<R, E, A>
  }) => Generator<T, A0, any>
) => Sync<_R<T>, _E<T>, A0>
export function gen<E0, A0>(): <T extends GenSync<any, E0, any>>(
  f: (i: {
    <A>(_: Tag<A>): GenSync<Has<A>, never, A>
    <E, A>(_: O.Option<A>, onNone: () => E): GenSync<unknown, E, A>
    <A>(_: O.Option<A>): GenSync<unknown, NoSuchElementError, A>
    <E, A>(_: E.Either<E, A>): GenSync<unknown, E, A>
    <R, E, A>(_: Sync<R, E, A>): GenSync<R, E, A>
  }) => Generator<T, A0, any>
) => Sync<_R<T>, _E<T>, A0>
export function gen<A0>(): <T extends GenSync<any, any, any>>(
  f: (i: {
    <A>(_: Tag<A>): GenSync<Has<A>, never, A>
    <E, A>(_: O.Option<A>, onNone: () => E): GenSync<unknown, E, A>
    <A>(_: O.Option<A>): GenSync<unknown, NoSuchElementError, A>
    <E, A>(_: E.Either<E, A>): GenSync<unknown, E, A>
    <R, E, A>(_: Sync<R, E, A>): GenSync<R, E, A>
  }) => Generator<T, A0, any>
) => Sync<_R<T>, _E<T>, A0>
export function gen<T extends GenSync<any, any, any>, A>(
  f: (i: {
    <A>(_: Tag<A>): GenSync<Has<A>, never, A>
    <E, A>(_: O.Option<A>, onNone: () => E): GenSync<unknown, E, A>
    <A>(_: O.Option<A>): GenSync<unknown, NoSuchElementError, A>
    <E, A>(_: E.Either<E, A>): GenSync<unknown, E, A>
    <R, E, A>(_: Sync<R, E, A>): GenSync<R, E, A>
  }) => Generator<T, A, any>
): Sync<_R<T>, _E<T>, A>
export function gen(...args: any[]): any {
  const _gen = <T extends GenSync<any, any, any>, A>(f: (i: any) => Generator<T, A, any>): Sync<_R<T>, _E<T>, A> =>
    deferTotal(() => {
      const iterator = f(adapter as any)
      const state    = iterator.next()

      const run = (state: IteratorYieldResult<T> | IteratorReturnResult<A>): Sync<any, any, A> => {
        if (state.done) {
          return succeed(state.value)
        }
        return bind_(state.value.S, (v) => {
          const next = iterator.next(v)
          return run(next)
        })
      }

      return run(state)
    })

  if (args.length === 0) {
    return (f: any) => _gen(f)
  }

  return _gen(args[0])
}

export { SyncURI } from './Modules'
