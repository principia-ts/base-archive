import type { MReaderURI } from './Modules'
import type * as HKT from '@principia/base/HKT'

import { identity, pipe } from '@principia/base/function'
import * as P from '@principia/base/typeclass'

import * as Mu from './Multi'

export interface MReader<R, A> extends Mu.Multi<never, unknown, never, R, never, A> {}

export type V = HKT.V<'R', '-'>

/*
 * -------------------------------------------
 * Reader
 * -------------------------------------------
 */

export const ask: <R>() => MReader<R, R> = Mu.ask

export const asks: <R, A>(f: (r: R) => A) => MReader<R, A> = Mu.asks

export const asksM: <R, R1, A>(f: (R: R) => MReader<R1, A>) => MReader<R & R1, A> = Mu.asksM

export const giveAll_: <R, A>(ra: MReader<R, A>, r: R) => MReader<unknown, A> = Mu.giveAll_

export const giveAll: <R>(r: R) => <A>(ra: MReader<R, A>) => MReader<unknown, A> = Mu.giveAll

export const gives_: <R0, R, A>(ra: MReader<R, A>, f: (r0: R0) => R) => MReader<R0, A> = Mu.gives_

export const gives: <R0, R>(f: (r0: R0) => R) => <A>(ra: MReader<R, A>) => MReader<R0, A> = Mu.gives

export function runReader_<A>(ra: MReader<unknown, A>): A
export function runReader_<R, A>(ra: MReader<R, A>, r: R): A
export function runReader_<R, A>(ra: MReader<R, A>, r?: R): A {
  return r ? Mu.runEnv_(ra, r) : Mu.runResult(ra as any)
}

export function runReader(): <A>(ra: MReader<unknown, A>) => A
export function runReader<R>(r: R): <A>(ra: MReader<R, A>) => A
export function runReader<R>(r?: R): <A>(ra: MReader<R, A>) => A {
  return (ra) => runReader_(ra, r as any)
}

/*
 * -------------------------------------------
 * Applicative
 * -------------------------------------------
 */

export const pure: <A>(a: A) => MReader<unknown, A> = Mu.pure

/*
 * -------------------------------------------
 * Monoidal
 * -------------------------------------------
 */

export const unit: () => MReader<unknown, void> = Mu.unit

/*
 * -------------------------------------------
 * Semimonoidal
 * -------------------------------------------
 */

export const cross_: <R, A, R1, B>(fa: MReader<R, A>, fb: MReader<R1, B>) => MReader<R & R1, readonly [A, B]> =
  Mu.cross_

export const cross: <R1, B>(fb: MReader<R1, B>) => <R, A>(fa: MReader<R, A>) => MReader<R & R1, readonly [A, B]> =
  Mu.cross

export const crossWith_: <R, A, R1, B, C>(
  fa: MReader<R, A>,
  fb: MReader<R1, B>,
  f: (a: A, b: B) => C
) => MReader<R & R1, C> = Mu.crossWith_

export const crossWith: <A, R1, B, C>(
  fb: MReader<R1, B>,
  f: (a: A, b: B) => C
) => <R>(fa: MReader<R, A>) => MReader<R & R1, C> = Mu.crossWith

/*
 * -------------------------------------------
 * Apply
 * -------------------------------------------
 */

export const ap_: <R, A, R1, B>(fab: MReader<R1, (a: A) => B>, fa: MReader<R, A>) => MReader<R & R1, B> = Mu.ap_

export const ap: <R, A>(fa: MReader<R, A>) => <R1, B>(fab: MReader<R1, (a: A) => B>) => MReader<R & R1, B> = Mu.ap

export const apl_: <R, A, R1, B>(fa: MReader<R, A>, fb: MReader<R1, B>) => MReader<R & R1, A> = Mu.apl_

export const apl: <R1, B>(fb: MReader<R1, B>) => <R, A>(fa: MReader<R, A>) => MReader<R & R1, A> = Mu.apl

export const apr_: <R, A, R1, B>(fa: MReader<R, A>, fb: MReader<R1, B>) => MReader<R & R1, B> = Mu.apr_

export const apr: <R1, B>(fb: MReader<R1, B>) => <R, A>(fa: MReader<R, A>) => MReader<R & R1, B> = Mu.apr

/*
 * -------------------------------------------
 * Functor
 * -------------------------------------------
 */

export const map_: <R, A, B>(fa: MReader<R, A>, f: (a: A) => B) => MReader<R, B> = Mu.map_

export const map: <A, B>(f: (a: A) => B) => <R>(fa: MReader<R, A>) => MReader<R, B> = Mu.map

/*
 * -------------------------------------------
 * Monad
 * -------------------------------------------
 */

export const bind_: <R, A, R1, B>(ma: MReader<R, A>, f: (a: A) => MReader<R1, B>) => MReader<R & R1, B> = Mu.bind_

export const bind: <A, R1, B>(f: (a: A) => MReader<R1, B>) => <R>(ma: MReader<R, A>) => MReader<R & R1, B> = Mu.bind

export function flatten<R, R1, A>(mma: MReader<R, MReader<R1, A>>): MReader<R & R1, A> {
  return bind_(mma, identity)
}

export const tap_: <R, A, R1, B>(ma: MReader<R, A>, f: (a: A) => MReader<R1, B>) => MReader<R & R1, A> = Mu.tap_

export const tap: <A, R1, B>(f: (a: A) => MReader<R1, B>) => <R>(ma: MReader<R, A>) => MReader<R & R1, A> = Mu.tap

/*
 * -------------------------------------------
 * Category
 * -------------------------------------------
 */

export function compose_<R, A, B>(ra: MReader<R, A>, ab: MReader<A, B>): MReader<R, B> {
  return bind_(ra, (a) => giveAll_(ab, a))
}

export function compose<A, B>(ab: MReader<A, B>): <R>(ra: MReader<R, A>) => MReader<R, B> {
  return (ra) => compose_(ra, ab)
}

/*
 * -------------------------------------------
 * Profunctor
 * -------------------------------------------
 */

export function dimap_<R, A, Q, B>(pa: MReader<R, A>, f: (q: Q) => R, g: (a: A) => B): MReader<Q, B> {
  return pipe(pa, gives(f), map(g))
}

export function dimap<R, A, Q, B>(f: (q: Q) => R, g: (a: A) => B): (pa: MReader<R, A>) => MReader<Q, B> {
  return (pa) => dimap_(pa, f, g)
}

/*
 * -------------------------------------------
 * Instances
 * -------------------------------------------
 */

export const MonadEnv: P.MonadEnv<[HKT.URI<MReaderURI>], V> = P.MonadEnv({
  map_,
  crossWith_,
  cross_,
  ap_,
  unit,
  pure,
  bind_,
  flatten,
  asks,
  giveAll_
})

export { MReaderURI } from './Modules'
