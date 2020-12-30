import * as HKT from '../HKT'
import * as P from '../typeclass'
import { identity, pipe, tuple } from './Function'

/*
 * -------------------------------------------
 * Model
 * -------------------------------------------
 */

export type Identity<A> = A

export const URI = 'Identity'

export type URI = typeof URI

export type V = HKT.Auto

declare module '../HKT' {
  interface URItoKind<FC, TC, N extends string, K, Q, W, X, I, S, R, E, A> {
    readonly [URI]: Identity<A>
  }
}

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

export const product_: <A, B>(fa: A, fb: B) => readonly [A, B] = tuple

export const product = <B>(fb: B) => <A>(fa: A): readonly [A, B] => product_(fa, fb)

export function ap_<A, B>(fab: (a: A) => B, fa: A): B {
  return fab(fa)
}

export function ap<A>(fa: A): <B>(fab: (a: A) => B) => B {
  return (fab) => fab(fa)
}

export function apFirst_<A, B>(fa: A, fb: B): A {
  return ap_(
    map_(fa, (a) => () => a),
    fb
  )
}

export function apFirst<B>(fb: B): <A>(fa: A) => A {
  return (fa) => apFirst_(fa, fb)
}

export function apSecond_<A, B>(fa: A, fb: B): B {
  return ap_(
    map_(fa, (_) => (b: B) => b),
    fb
  )
}

export function apSecond<B>(fb: B): <A>(fa: A) => B {
  return (fa) => apSecond_(fa, fb)
}

export function map2_<A, B, C>(fa: A, fb: B, f: (a: A, b: B) => C): C {
  return f(fa, fb)
}

export function map2<A, B, C>(fb: B, f: (a: A, b: B) => C): (fa: A) => C {
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

export function foldLeft_<A, B>(fa: A, b: B, f: (b: B, a: A) => B): B {
  return f(b, fa)
}

export function foldLeft<A, B>(b: B, f: (b: B, a: A) => B): (fa: A) => B {
  return (fa) => f(b, fa)
}

export function foldMap_<M>(_: P.Monoid<M>): <A>(fa: A, f: (a: A) => M) => M {
  return (fa, f) => f(fa)
}

export function foldMap<M>(_: P.Monoid<M>): <A>(f: (a: A) => M) => (fa: A) => M {
  return (f) => (fa) => f(fa)
}

export function foldRight_<A, B>(fa: A, b: B, f: (a: A, b: B) => B): B {
  return f(fa, b)
}

export function foldRight<A, B>(b: B, f: (a: A, b: B) => B): (fa: A) => B {
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

export function flatMap_<A, B>(ma: A, f: (a: A) => B): B {
  return f(ma)
}

export function flatMap<A, B>(f: (a: A) => B): (ma: A) => B {
  return (ma) => f(ma)
}

export function tap_<A, B>(ma: A, f: (a: A) => B): A {
  return flatMap_(ma, (a) => map_(f(a), () => a))
}

export function tap<A, B>(f: (a: A) => B): (ma: A) => A {
  return (ma) => tap_(ma, f)
}

export function flatten<A>(mma: A): A {
  return flatMap_(mma, identity)
}

/*
 * -------------------------------------------
 * Traversable
 * -------------------------------------------
 */

export const traverse_: P.TraverseFn_<[URI], V> = P.implementTraverse_<[URI], V>()((_) => (G) => (ta, f) =>
  pipe(f(ta), G.map(identity))
)

export const traverse: P.TraverseFn<[URI], V> = (G) => {
  const traverseG_ = traverse_(G)
  return (f) => (ta) => traverseG_(ta, f)
}

export const sequence: P.SequenceFn<[URI], V> = (G) => (ta) => pipe(ta, G.map(identity))

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

export const Functor = HKT.instance<P.Functor<[URI], V>>({
  imap_: (fa, f, _) => map_(fa, f),
  imap: (f, _) => (fa) => map_(fa, f),
  map_,
  map
})

export const Apply = HKT.instance<P.Apply<[URI], V>>({
  ...Functor,
  ap_,
  ap,
  map2_,
  map2,
  product_,
  product
})

export const Applicative = HKT.instance<P.Applicative<[URI], V>>({
  ...Apply,
  pure,
  unit
})
