import type { Eq } from './Eq'
import type { Show } from './Show'

import * as E from './Either'
import { makeEq } from './Eq/core'
import { flow, identity, pipe, tuple } from './Function'
import * as HKT from './HKT'
import * as O from './Option'
import { makeShow } from './Show/core'
import * as P from './typeclass'
import { makeSemigroup } from './typeclass'

/*
 * -------------------------------------------
 * Model
 * -------------------------------------------
 */

export interface Both<E, A> {
  readonly _tag: 'Both'
  readonly left: E
  readonly right: A
}

export interface Left<E> {
  readonly _tag: 'Left'
  readonly left: E
}

export interface Right<A> {
  readonly _tag: 'Right'
  readonly right: A
}

export type These<E, A> = Left<E> | Right<A> | Both<E, A>

export const URI = 'These'
export type URI = typeof URI

export type V = HKT.V<'E', '+'>

declare module './HKT' {
  interface URItoKind<FC, TC, N, K, Q, W, X, I, S, R, E, A> {
    readonly [URI]: These<E, A>
  }
}

/*
 * -------------------------------------------
 * Constructors
 * -------------------------------------------
 */

export function left<E = never, A = never>(left: E): These<E, A> {
  return { _tag: 'Left', left }
}

export function right<E = never, A = never>(right: A): These<E, A> {
  return { _tag: 'Right', right }
}

export function both<E, A>(left: E, right: A): These<E, A> {
  return { _tag: 'Both', left, right }
}

export function rightOrThese_<E, A>(me: O.Option<E>, a: A): These<E, A> {
  return O.isNone(me) ? right(a) : both(me.value, a)
}

export function rightOrThese<A>(a: A): <E>(me: O.Option<E>) => These<E, A> {
  return (me) => rightOrThese_(me, a)
}

export function leftOrThese_<E, A>(me: O.Option<A>, e: E): These<E, A> {
  return O.isNone(me) ? left(e) : both(e, me.value)
}

export function leftOrThese<E>(e: E): <A>(me: O.Option<A>) => These<E, A> {
  return (me) => leftOrThese_(me, e)
}

export function fromOptions<E, A>(fe: O.Option<E>, fa: O.Option<A>): O.Option<These<E, A>> {
  return O.isNone(fe)
    ? O.isNone(fa)
      ? O.none()
      : O.some(right(fa.value))
    : O.isNone(fa)
    ? O.some(left(fe.value))
    : O.some(both(fe.value, fa.value))
}

/*
 * -------------------------------------------
 * Guards
 * -------------------------------------------
 */

export function isLeft<E, A>(fa: These<E, A>): fa is E.Left<E> {
  return fa._tag === 'Left'
}

export function isRight<E, A>(fa: These<E, A>): fa is E.Right<A> {
  return fa._tag === 'Right'
}

export function isBoth<E, A>(fa: These<E, A>): fa is Both<E, A> {
  return fa._tag === 'Both'
}

/*
 * -------------------------------------------
 * Destructors
 * -------------------------------------------
 */

export function fold_<E, A, B, C, D>(
  fa: These<E, A>,
  onLeft: (e: E) => B,
  onRight: (a: A) => C,
  onBoth: (e: E, a: A) => D
): B | C | D {
  switch (fa._tag) {
    case 'Left': {
      return onLeft(fa.left)
    }
    case 'Right': {
      return onRight(fa.right)
    }
    case 'Both': {
      return onBoth(fa.left, fa.right)
    }
  }
}

export function fold<E, A, B, C, D>(
  onLeft: (e: E) => B,
  onRight: (a: A) => C,
  onBoth: (e: E, a: A) => D
): (fa: These<E, A>) => B | C | D {
  return (fa) => fold_(fa, onLeft, onRight, onBoth)
}

export function toTuple_<E, A>(fa: These<E, A>, e: E, a: A): readonly [E, A] {
  return isLeft(fa) ? [fa.left, a] : isRight(fa) ? [e, fa.right] : [fa.left, fa.right]
}

export function toTuple<E, A>(e: E, a: A): (fa: These<E, A>) => readonly [E, A] {
  return (fa) => toTuple_(fa, e, a)
}

export function getLeft<E, A>(fa: These<E, A>): O.Option<E> {
  return isRight(fa) ? O.none() : O.some(fa.left)
}

export function getRight<E, A>(fa: These<E, A>): O.Option<A> {
  return isLeft(fa) ? O.none() : O.some(fa.right)
}

export function getLeftOnly<E, A>(fa: These<E, A>): O.Option<E> {
  return isLeft(fa) ? O.some(fa.left) : O.none()
}

export function getRightOnly<E, A>(fa: These<E, A>): O.Option<A> {
  return isRight(fa) ? O.some(fa.right) : O.none()
}

/*
 * -------------------------------------------
 * Applicative
 * -------------------------------------------
 */

export function getApplicative<E>(SE: P.Semigroup<E>): P.Applicative<[URI], HKT.Fix<'E', E>> {
  return HKT.instance({
    ...getApply(SE),
    unit,
    pure: right
  })
}

/*
 * -------------------------------------------
 * ApplicativeExcept
 * -------------------------------------------
 */

export function getApplicativeExcept<E>(SE: P.Semigroup<E>): P.ApplicativeExcept<[URI], HKT.Fix<'E', E>> {
  const catchAll_: P.CatchAllFn_<[URI], HKT.Fix<'E', E>>   = (fa, f) => (fa._tag === 'Left' ? f(fa.left) : fa)
  const catchAll: P.CatchAllFn<[URI], HKT.Fix<'E', E>>     = (f) => (fa) => catchAll_(fa, f)
  const catchSome_: P.CatchSomeFn_<[URI], HKT.Fix<'E', E>> = <A, A1>(
    fa: These<E, A>,
    f: (e: E) => O.Option<These<E, A1>>
  ) =>
    catchAll_(
      fa,
      flow(
        f,
        O.getOrElse((): These<E, A | A1> => fa)
      )
    )

  return HKT.instance<P.ApplicativeExcept<[URI], HKT.Fix<'E', E>>>({
    ...getApplicative(SE),
    fail: left,
    catchAll_,
    catchAll,
    catchSome_,
    catchSome: (f) => (fa) => catchSome_(fa, f),
    attempt: flow(map(E.right), catchAll(flow(E.left, right)))
  })
}

/*
 * -------------------------------------------
 * Apply
 * -------------------------------------------
 */

export function getApply<E>(SE: P.Semigroup<E>): P.Apply<[URI], HKT.Fix<'E', E>> {
  const crossWith_: P.CrossWithFn_<[URI], HKT.Fix<'E', E>> = (fa, fb, f) =>
    isLeft(fa)
      ? isLeft(fb)
        ? left(SE.combine_(fa.left, fb.left))
        : isRight(fb)
        ? fa
        : left(SE.combine_(fa.left, fb.left))
      : isRight(fa)
      ? isLeft(fb)
        ? left(fb.left)
        : isRight(fb)
        ? right(f(fa.right, fb.right))
        : both(fb.left, f(fa.right, fb.right))
      : isLeft(fb)
      ? left(SE.combine_(fa.left, fb.left))
      : isRight(fb)
      ? both(fa.left, f(fa.right, fb.right))
      : both(SE.combine_(fa.left, fb.left), f(fa.right, fb.right))

  return HKT.instance({
    invmap_: (fa, f, _) => map_(fa, f),
    invmap: <A, B>(f: (a: A) => B, _: (b: B) => A) => (fa: These<E, A>) => map_(fa, f),
    map_,
    map,
    crossWith_,
    crossWith: <A, B, C>(fb: These<E, B>, f: (a: A, b: B) => C) => (fa: These<E, A>) => crossWith_(fa, fb, f),
    cross_: (fa, fb) => crossWith_(fa, fb, tuple),
    cross: <B>(fb: These<E, B>) => <A>(fa: These<E, A>) => crossWith_(fa, fb, tuple),
    ap_: (fab, fa) => crossWith_(fab, fa, (f, a) => f(a)),
    ap: <A>(fa: These<E, A>) => <B>(fab: These<E, (a: A) => B>) => crossWith_(fab, fa, (f, a) => f(a))
  })
}

/*
 * -------------------------------------------
 * Bifunctor
 * -------------------------------------------
 */

export function bimap_<E, A, G, B>(pab: These<E, A>, f: (e: E) => G, g: (a: A) => B): These<G, B> {
  return isLeft(pab) ? left(f(pab.left)) : isRight(pab) ? right(g(pab.right)) : both(f(pab.left), g(pab.right))
}

export function bimap<E, A, G, B>(f: (e: E) => G, g: (a: A) => B): (pab: These<E, A>) => These<G, B> {
  return (pab) => bimap_(pab, f, g)
}

export function mapLeft_<E, A, G>(pab: These<E, A>, f: (e: E) => G): These<G, A> {
  return isLeft(pab) ? left(f(pab.left)) : isBoth(pab) ? both(f(pab.left), pab.right) : pab
}

export function mapLeft<E, G>(f: (e: E) => G): <A>(pab: These<E, A>) => These<G, A> {
  return (pab) => mapLeft_(pab, f)
}

export function swap<E, A>(pab: These<E, A>): These<A, E> {
  return isLeft(pab) ? right(pab.left) : isRight(pab) ? left(pab.right) : both(pab.right, pab.left)
}

/*
 * -------------------------------------------
 * Eq
 * -------------------------------------------
 */

export function getEq<E, A>(EE: Eq<E>, EA: Eq<A>): Eq<These<E, A>> {
  return makeEq((x, y) =>
    isLeft(x)
      ? isLeft(y) && EE.equals_(x.left, y.left)
      : isRight(x)
      ? isRight(y) && EA.equals_(x.right, y.right)
      : isBoth(y) && EE.equals_(x.left, y.left) && EA.equals_(x.right, y.right)
  )
}

/*
 * -------------------------------------------
 * Foldable
 * -------------------------------------------
 */

export function foldl_<E, A, B>(fa: These<E, A>, b: B, f: (b: B, a: A) => B): B {
  return isLeft(fa) ? b : f(b, fa.right)
}

export function foldl<A, B>(b: B, f: (b: B, a: A) => B): <E>(fa: These<E, A>) => B {
  return (fa) => foldl_(fa, b, f)
}

export function foldMap_<M>(M: P.Monoid<M>): <E, A>(fa: These<E, A>, f: (a: A) => M) => M {
  return (fa, f) => (isLeft(fa) ? M.nat : f(fa.right))
}

export function foldMap<M>(M: P.Monoid<M>): <A>(f: (a: A) => M) => <E>(fa: These<E, A>) => M {
  return (f) => (fa) => foldMap_(M)(fa, f)
}

export function foldr_<E, A, B>(fa: These<E, A>, b: B, f: (a: A, b: B) => B): B {
  return isLeft(fa) ? b : f(fa.right, b)
}

export function foldr<A, B>(b: B, f: (a: A, b: B) => B): <E>(fa: These<E, A>) => B {
  return (fa) => foldr_(fa, b, f)
}

/*
 * -------------------------------------------
 * Functor
 * -------------------------------------------
 */

export function map_<E, A, B>(fa: These<E, A>, f: (a: A) => B): These<E, B> {
  return isLeft(fa) ? fa : isRight(fa) ? right(f(fa.right)) : both(fa.left, f(fa.right))
}

export function map<A, B>(f: (a: A) => B): <E>(fa: These<E, A>) => These<E, B> {
  return (fa) => map_(fa, f)
}

/*
 * -------------------------------------------
 * Monad
 * -------------------------------------------
 */

export function getMonad<E>(SE: P.Semigroup<E>): P.Monad<[URI], HKT.Fix<'E', E>> {
  const bind_: P.BindFn_<[URI], HKT.Fix<'E', E>> = (ma, f) => {
    if (isLeft(ma)) {
      return ma
    }
    if (isRight(ma)) {
      return f(ma.right)
    }
    const fb = f(ma.right)
    return isLeft(fb)
      ? left(SE.combine_(ma.left, fb.left))
      : isRight(fb)
      ? both(ma.left, fb.right)
      : both(SE.combine_(ma.left, fb.left), fb.right)
  }
  return HKT.instance<P.Monad<[URI], HKT.Fix<'E', E>>>({
    ...getApplicative(SE),
    bind_: bind_,
    bind: (f) => (ma) => bind_(ma, f),
    flatten: (mma) => bind_(mma, identity)
  })
}

/*
 * -------------------------------------------
 * MonadExcept
 * -------------------------------------------
 */

export function getMonadExcept<E>(SE: P.Semigroup<E>): P.MonadExcept<[URI], HKT.Fix<'E', E>> {
  const m = getMonad(SE)
  return HKT.instance<P.MonadExcept<[URI], HKT.Fix<'E', E>>>({
    ...getApplicativeExcept(SE),
    ...m,
    absolve: m.flatten
  })
}

/*
 * -------------------------------------------
 * Semigroup
 * -------------------------------------------
 */

export function getSemigroup<E, A>(SE: P.Semigroup<E>, SA: P.Semigroup<A>): P.Semigroup<These<E, A>> {
  return makeSemigroup((x, y) =>
    isLeft(x)
      ? isLeft(y)
        ? left(SE.combine_(x.left, y.left))
        : isRight(y)
        ? both(x.left, y.right)
        : both(SE.combine_(x.left, y.left), y.right)
      : isRight(x)
      ? isLeft(y)
        ? both(y.left, x.right)
        : isRight(y)
        ? right(SA.combine_(x.right, y.right))
        : both(y.left, SA.combine_(x.right, y.right))
      : isLeft(y)
      ? both(SE.combine_(x.left, y.left), x.right)
      : isRight(y)
      ? both(x.left, SA.combine_(x.right, y.right))
      : both(SE.combine_(x.left, y.left), SA.combine_(x.right, y.right))
  )
}

/*
 * -------------------------------------------
 * Show
 * -------------------------------------------
 */

export function getShow<E, A>(SE: Show<E>, SA: Show<A>): Show<These<E, A>> {
  return makeShow(
    fold(
      (l) => `Left(${SE.show(l)})`,
      (r) => `Right(${SA.show(r)})`,
      (l, r) => `Both(${SE.show(l)}, ${SA.show(r)})`
    )
  )
}

/*
 * -------------------------------------------
 * Traversable
 * -------------------------------------------
 */

export const traverse_ = P.implementTraverse_<[URI], V>()((_) => (G) => {
  return (ta, f) => {
    return isLeft(ta)
      ? G.pure(ta)
      : isRight(ta)
      ? G.map_(f(ta.right), right)
      : G.map_(f(ta.right), (b) => both(ta.left, b))
  }
})

export const traverse: P.TraverseFn<[URI], V> = (G) => {
  const traverseG_ = traverse_(G)
  return (f) => (ta) => traverseG_(ta, f)
}

export const sequence = P.implementSequence<[URI], V>()((_) => (G) => traverse(G)(identity))

/*
 * -------------------------------------------
 * Unit
 * -------------------------------------------
 */

export function unit(): These<never, void> {
  return right(undefined)
}
