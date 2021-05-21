import type * as HKT from './HKT'
import type { IdentityURI } from './Modules'

import * as P from './prelude'
import { tuple } from './tuple'

/*
 * -------------------------------------------------------------------------------------------------
 * Model
 * -------------------------------------------------------------------------------------------------
 */

export type Identity<A> = A

type URI = [HKT.URI<IdentityURI>]

/*
 * -------------------------------------------------------------------------------------------------
 * Alt
 * -------------------------------------------------------------------------------------------------
 */

/**
 * @optimize identity
 */
export const alt_: <A>(fa: A, that: () => A) => A = P.identity

/**
 * @optimize identity
 */
export const alt =
  <A>(that: () => A) =>
  (fa: A): A =>
    alt_(fa, that)

/*
 * -------------------------------------------------------------------------------------------------
 * Applicative
 * -------------------------------------------------------------------------------------------------
 */

/**
 * @optimize identity
 */
export function pure<A>(a: A): A {
  return a
}

/*
 * -------------------------------------------------------------------------------------------------
 * Apply
 * -------------------------------------------------------------------------------------------------
 */

export const cross_: <A, B>(fa: A, fb: B) => readonly [A, B] = tuple

export const cross =
  <B>(fb: B) =>
  <A>(fa: A): readonly [A, B] =>
    cross_(fa, fb)

export function ap_<A, B>(fab: (a: A) => B, fa: A): B {
  return fab(fa)
}

export function ap<A>(fa: A): <B>(fab: (a: A) => B) => B {
  return (fab) => fab(fa)
}

export function apl_<A, B>(fa: A, fb: B): A {
  return ap_(
    map_(fa, (a) => () => a),
    fb
  )
}

export function apl<B>(fb: B): <A>(fa: A) => A {
  return (fa) => apl_(fa, fb)
}

export function apr_<A, B>(fa: A, fb: B): B {
  return ap_(
    map_(fa, (_) => (b: B) => b),
    fb
  )
}

export function apr<B>(fb: B): <A>(fa: A) => B {
  return (fa) => apr_(fa, fb)
}

export function crossWith_<A, B, C>(fa: A, fb: B, f: (a: A, b: B) => C): C {
  return f(fa, fb)
}

export function crossWith<A, B, C>(fb: B, f: (a: A, b: B) => C): (fa: A) => C {
  return (fa) => f(fa, fb)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Comonad
 * -------------------------------------------------------------------------------------------------
 */

export function extend_<A, B>(wa: A, f: (wa: A) => B): B {
  return f(wa)
}

export function extend<A, B>(f: (wa: A) => B): (wa: A) => B {
  return (wa) => f(wa)
}

/**
 * @optimize identity
 */
export const extract: <A>(wa: A) => A = P.identity

export const duplicate: <A>(wa: Identity<A>) => Identity<Identity<A>> = extend(P.identity)

/*
 * -------------------------------------------------------------------------------------------------
 * Foldable
 * -------------------------------------------------------------------------------------------------
 */

export function foldl_<A, B>(fa: A, b: B, f: (b: B, a: A) => B): B {
  return f(b, fa)
}

export function foldl<A, B>(b: B, f: (b: B, a: A) => B): (fa: A) => B {
  return (fa) => f(b, fa)
}

export function foldMap_<M>(_: P.Monoid<M>): <A>(fa: A, f: (a: A) => M) => M {
  return (fa, f) => f(fa)
}

export function foldMap<M>(_: P.Monoid<M>): <A>(f: (a: A) => M) => (fa: A) => M {
  return (f) => (fa) => f(fa)
}

export function foldr_<A, B>(fa: A, b: B, f: (a: A, b: B) => B): B {
  return f(fa, b)
}

export function foldr<A, B>(b: B, f: (a: A, b: B) => B): (fa: A) => B {
  return (fa) => f(fa, b)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Functor
 * -------------------------------------------------------------------------------------------------
 */

export function map_<A, B>(fa: A, f: (a: A) => B) {
  return f(fa)
}

export function map<A, B>(f: (a: A) => B): (fa: A) => B {
  return (fa) => f(fa)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Monad
 * -------------------------------------------------------------------------------------------------
 */

export function bind_<A, B>(ma: A, f: (a: A) => B): B {
  return f(ma)
}

export function bind<A, B>(f: (a: A) => B): (ma: A) => B {
  return (ma) => f(ma)
}

export function tap_<A, B>(ma: A, f: (a: A) => B): A {
  return bind_(ma, (a) => map_(f(a), () => a))
}

export function tap<A, B>(f: (a: A) => B): (ma: A) => A {
  return (ma) => tap_(ma, f)
}

export function flatten<A>(mma: A): A {
  return bind_(mma, P.identity)
}

/*
 * -------------------------------------------------------------------------------------------------
 * Traversable
 * -------------------------------------------------------------------------------------------------
 */

export const traverse_ = P.implementTraverse_<URI>()((_) => (G) => (ta, f) => P.pipe(f(ta), G.map(P.identity)))

export const traverse: P.TraverseFn<URI> = (G) => {
  const traverseG_ = traverse_(G)
  return (f) => (ta) => traverseG_(ta, f)
}

export const sequence: P.SequenceFn<URI> = (G) => (ta) => P.pipe(ta, G.map(P.identity))

/*
 * -------------------------------------------------------------------------------------------------
 * Unit
 * -------------------------------------------------------------------------------------------------
 */

export function unit(): void {
  return undefined
}

/*
 * -------------------------------------------------------------------------------------------------
 * Instances
 * -------------------------------------------------------------------------------------------------
 */

export const Functor = P.Functor<URI>({
  map_
})

export const Semimonoidal = P.SemimonoidalFunctor<URI>({
  map_,
  crossWith_,
  cross_
})

export const Apply = P.Apply<URI>({
  map_,
  crossWith_,
  cross_,
  ap_
})

export const Monoidal = P.MonoidalFunctor<URI>({
  map_,
  crossWith_,
  cross_,
  unit
})

export const Applicative = P.Applicative<URI>({
  map_,
  crossWith_,
  cross_,
  pure,
  unit
})

export const Monad = P.Monad<URI>({
  map_,
  crossWith_,
  cross_,
  pure,
  unit,
  bind_,
  flatten
})

export const Do = P.Do(Monad)

export const bindS   = P.bindSF(Monad)
export const letS    = P.letSF(Monad)
export const bindToS = P.bindToSF(Monad)

export { IdentityURI } from './Modules'
