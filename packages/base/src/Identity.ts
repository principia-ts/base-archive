import type { IdentityURI } from './Modules'

import { identity, pipe, tuple } from './Function'
import * as HKT from './HKT'
import * as P from './typeclass'

/*
 * -------------------------------------------
 * Model
 * -------------------------------------------
 */

export type Identity<A> = A

/*
 * -------------------------------------------
 * Alt
 * -------------------------------------------
 */

/**
 * @optimize identity
 */
export const alt_: <A>(fa: A, that: () => A) => A = identity

/**
 * @optimize identity
 */
export const alt = <A>(that: () => A) => (fa: A): A => alt_(fa, that)

/*
 * -------------------------------------------
 * Applicative
 * -------------------------------------------
 */

/**
 * @optimize identity
 */
export function pure<A>(a: A): A {
  return a
}

/*
 * -------------------------------------------
 * Apply
 * -------------------------------------------
 */

export const cross_: <A, B>(fa: A, fb: B) => readonly [A, B] = tuple

export const cross = <B>(fb: B) => <A>(fa: A): readonly [A, B] => cross_(fa, fb)

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
 * -------------------------------------------
 * Comonad
 * -------------------------------------------
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
export const extract: <A>(wa: A) => A = identity

export const duplicate: <A>(wa: Identity<A>) => Identity<Identity<A>> = extend(identity)

/*
 * -------------------------------------------
 * Foldable
 * -------------------------------------------
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
 * -------------------------------------------
 * Functor
 * -------------------------------------------
 */

export function map_<A, B>(fa: A, f: (a: A) => B) {
  return f(fa)
}

export function map<A, B>(f: (a: A) => B): (fa: A) => B {
  return (fa) => f(fa)
}

/*
 * -------------------------------------------
 * Monad
 * -------------------------------------------
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
  return bind_(mma, identity)
}

/*
 * -------------------------------------------
 * Traversable
 * -------------------------------------------
 */

export const traverse_ = P.implementTraverse_<[HKT.URI<IdentityURI>]>()((_) => (G) => (ta, f) =>
  pipe(f(ta), G.map(identity))
)

export const traverse: P.TraverseFn<[HKT.URI<IdentityURI>]> = (G) => {
  const traverseG_ = traverse_(G)
  return (f) => (ta) => traverseG_(ta, f)
}

export const sequence: P.SequenceFn<[HKT.URI<IdentityURI>]> = (G) => (ta) => pipe(ta, G.map(identity))

/*
 * -------------------------------------------
 * Unit
 * -------------------------------------------
 */

export function unit(): void {
  return undefined
}

/*
 * -------------------------------------------
 * Instances
 * -------------------------------------------
 */

export const Functor = HKT.instance<P.Functor<[HKT.URI<IdentityURI>]>>({
  invmap_: (fa, f, _) => map_(fa, f),
  invmap: (f, _) => (fa) => map_(fa, f),
  map_,
  map
})

export const Apply = HKT.instance<P.Apply<[HKT.URI<IdentityURI>]>>({
  ...Functor,
  ap_,
  ap,
  crossWith_,
  crossWith,
  cross_,
  cross
})

export const Applicative = HKT.instance<P.Applicative<[HKT.URI<IdentityURI>]>>({
  ...Apply,
  pure,
  unit
})

export { IdentityURI } from './Modules'
