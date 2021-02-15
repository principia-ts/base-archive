import type { ReaderURI } from './Modules'
import type * as P from './typeclass'

import { flow, identity, tuple } from './Function'
import * as HKT from './HKT'

/*
 * -------------------------------------------
 * Model
 * -------------------------------------------
 */

export interface Reader<R, A> {
  (r: R): A
}

export type V = HKT.V<'R', '-'>

/*
 * -------------------------------------------
 * Reader
 * -------------------------------------------
 */

export function ask<R>(): Reader<R, R> {
  return (r) => r
}

export function asks<R, A>(f: (r: R) => A): Reader<R, A> {
  return f
}

export function asksM<R, R1, A>(f: (r: R) => Reader<R1, A>): Reader<R & R1, A> {
  return (r) => f(r)(r)
}

export function gives_<Q, R, A>(ra: Reader<R, A>, f: (q: Q) => R): Reader<Q, A> {
  return (q) => ra(f(q))
}

export function gives<Q, R>(f: (q: Q) => R): <A>(ra: Reader<R, A>) => Reader<Q, A> {
  return (ra) => gives_(ra, f)
}

export function giveAll_<R, A>(ra: Reader<R, A>, r: R): Reader<unknown, A> {
  return () => ra(r)
}

export function giveAll<R>(r: R): <A>(ra: Reader<R, A>) => Reader<unknown, A> {
  return (ra) => giveAll_(ra, r)
}

export function runReader_<A>(ra: Reader<unknown, A>): A
export function runReader_<R, A>(ra: Reader<R, A>, r: R): A
export function runReader_<R, A>(ra: Reader<R, A>, r?: R): A {
  return r ? ra(r) : ra(undefined as any)
}

export function runReader(): <A>(ra: Reader<unknown, A>) => A
export function runReader<R>(r: R): <A>(ra: Reader<R, A>) => A
export function runReader<R>(r?: R): <A>(ra: Reader<R, A>) => A {
  return (ra) => (r ? ra(r) : ra(undefined as any))
}

/*
 * -------------------------------------------
 * Applicative
 * -------------------------------------------
 */

export function pure<A>(a: A): Reader<unknown, A> {
  return () => a
}

/*
 * -------------------------------------------
 * Apply
 * -------------------------------------------
 */

export function cross_<R, A, R1, B>(fa: Reader<R, A>, fb: Reader<R1, B>): Reader<R & R1, readonly [A, B]> {
  return crossWith_(fa, fb, tuple)
}

export function cross<R1, B>(fb: Reader<R1, B>): <R, A>(fa: Reader<R, A>) => Reader<R & R1, readonly [A, B]> {
  return (fa) => cross_(fa, fb)
}

export function crossWith_<R, A, R1, B, C>(
  fa: Reader<R, A>,
  fb: Reader<R1, B>,
  f: (a: A, b: B) => C
): Reader<R & R1, C> {
  return (r) => f(fa(r), fb(r))
}

export function crossWith<A, R1, B, C>(
  fb: Reader<R1, B>,
  f: (a: A, b: B) => C
): <R>(fa: Reader<R, A>) => Reader<R & R1, C> {
  return (fa) => crossWith_(fa, fb, f)
}

export function ap_<R, A, R1, B>(fab: Reader<R1, (a: A) => B>, fa: Reader<R, A>): Reader<R & R1, B> {
  return (r) => fab(r)(fa(r))
}

export function ap<R, A>(fa: Reader<R, A>): <R1, B>(fab: Reader<R1, (a: A) => B>) => Reader<R & R1, B> {
  return (fab) => ap_(fab, fa)
}

export function apl_<R, A, R1, B>(fa: Reader<R, A>, fb: Reader<R1, B>): Reader<R & R1, A> {
  return crossWith_(fa, fb, (a, _) => a)
}

export function apl<R1, B>(fb: Reader<R1, B>): <R, A>(fa: Reader<R, A>) => Reader<R & R1, A> {
  return (fa) => apl_(fa, fb)
}

export function apr_<R, A, R1, B>(fa: Reader<R, A>, fb: Reader<R1, B>): Reader<R & R1, B> {
  return crossWith_(fa, fb, (_, b) => b)
}

export function apr<R1, B>(fb: Reader<R1, B>): <R, A>(fa: Reader<R, A>) => Reader<R & R1, B> {
  return (fa) => apr_(fa, fb)
}

/* -------------------------------------------
 * Category
 * -------------------------------------------
 */

export function compose_<R, A, B>(fa: Reader<R, A>, fb: Reader<A, B>): Reader<R, B> {
  return flow(fa, fb)
}

export function compose<A, B>(fb: Reader<A, B>): <R>(fa: Reader<R, A>) => Reader<R, B> {
  return (fa) => compose_(fa, fb)
}

export function id<R>(): Reader<R, R> {
  return identity
}

/*
 * -------------------------------------------
 * Functor
 * -------------------------------------------
 */

export function map_<R, A, B>(fa: Reader<R, A>, f: (a: A) => B): Reader<R, B> {
  return (r) => f(fa(r))
}

export function map<A, B>(f: (a: A) => B): <R>(fa: Reader<R, A>) => Reader<R, B> {
  return (fa) => map_(fa, f)
}

/*
 * -------------------------------------------
 * Monad
 * -------------------------------------------
 */

export function bind_<R, A, R1, B>(ma: Reader<R, A>, f: (a: A) => Reader<R1, B>): Reader<R & R1, B> {
  return (r) => f(ma(r))(r)
}

export function bind<A, R1, B>(f: (a: A) => Reader<R1, B>): <R>(ma: Reader<R, A>) => Reader<R & R1, B> {
  return (ma) => bind_(ma, f)
}

export function flatten<R, R1, A>(mma: Reader<R, Reader<R1, A>>): Reader<R & R1, A> {
  return (r) => mma(r)(r)
}

export function tap_<R, A, R1, B>(ma: Reader<R, A>, f: (a: A) => Reader<R1, B>): Reader<R & R1, A> {
  return (r) => bind_(ma, (a) => map_(f(a), () => a))(r)
}

export function tap<A, R1, B>(f: (a: A) => Reader<R1, B>): <R>(ma: Reader<R, A>) => Reader<R & R1, A> {
  return (ma) => tap_(ma, f)
}

/*
 * -------------------------------------------
 * Profunctor
 * -------------------------------------------
 */

export function promap_<R, A, Q, B>(pa: Reader<R, A>, f: (q: Q) => R, g: (a: A) => B): Reader<Q, B> {
  return (q) => g(pa(f(q)))
}

export function promap<R, A, Q, B>(f: (q: Q) => R, g: (a: A) => B): (pa: Reader<R, A>) => Reader<Q, B> {
  return (pa) => promap_(pa, f, g)
}

/*
 * -------------------------------------------
 * Unit Reader
 * -------------------------------------------
 */

export function unit(): Reader<unknown, void> {
  return () => undefined
}

export const MonadEnv = HKT.instance<P.MonadEnv<[HKT.URI<ReaderURI>], V>>({
  invmap_: (ra, f, _) => map_(ra, f),
  invmap: (f, _) => (ra) => map_(ra, f),
  map_,
  map,
  crossWith_,
  crossWith,
  ap_,
  ap,
  cross_,
  cross,
  asks,
  giveAll,
  pure,
  unit,
  bind,
  bind_,
  flatten
})

export { ReaderURI } from './Modules'
