import type { ZReaderURI } from './Modules'
import type * as HKT from '@principia/prelude/HKT'

import * as P from '@principia/prelude'
import { identity, pipe } from '@principia/prelude/function'

import * as Mu from './Z'

export interface ZReader<R, A> extends Mu.Z<never, unknown, never, R, never, A> {}

export type V = HKT.V<'R', '-'>

/*
 * -------------------------------------------
 * Reader
 * -------------------------------------------
 */

export const ask: <R>() => ZReader<R, R> = Mu.ask

export const asks: <R, A>(f: (r: R) => A) => ZReader<R, A> = Mu.asks

export const asksM: <R, R1, A>(f: (R: R) => ZReader<R1, A>) => ZReader<R & R1, A> = Mu.asksM

export const giveAll_: <R, A>(ra: ZReader<R, A>, r: R) => ZReader<unknown, A> = Mu.giveAll_

export const giveAll: <R>(r: R) => <A>(ra: ZReader<R, A>) => ZReader<unknown, A> = Mu.giveAll

export const gives_: <R0, R, A>(ra: ZReader<R, A>, f: (r0: R0) => R) => ZReader<R0, A> = Mu.gives_

export const gives: <R0, R>(f: (r0: R0) => R) => <A>(ra: ZReader<R, A>) => ZReader<R0, A> = Mu.gives

export function runReader_<A>(ra: ZReader<unknown, A>): A
export function runReader_<R, A>(ra: ZReader<R, A>, r: R): A
export function runReader_<R, A>(ra: ZReader<R, A>, r?: R): A {
  return r ? Mu.runReader_(ra, r) : Mu.runResult(ra as any)
}

export function runReader(): <A>(ra: ZReader<unknown, A>) => A
export function runReader<R>(r: R): <A>(ra: ZReader<R, A>) => A
export function runReader<R>(r?: R): <A>(ra: ZReader<R, A>) => A {
  return (ra) => runReader_(ra, r as any)
}

/*
 * -------------------------------------------
 * Applicative
 * -------------------------------------------
 */

export const pure: <A>(a: A) => ZReader<unknown, A> = Mu.pure

/*
 * -------------------------------------------
 * Monoidal
 * -------------------------------------------
 */

export const unit: () => ZReader<unknown, void> = Mu.unit

/*
 * -------------------------------------------
 * Semimonoidal
 * -------------------------------------------
 */

export const cross_: <R, A, R1, B>(fa: ZReader<R, A>, fb: ZReader<R1, B>) => ZReader<R & R1, readonly [A, B]> = Mu.zip_

export const cross: <R1, B>(fb: ZReader<R1, B>) => <R, A>(fa: ZReader<R, A>) => ZReader<R & R1, readonly [A, B]> =
  Mu.zip

export const crossWith_: <R, A, R1, B, C>(
  fa: ZReader<R, A>,
  fb: ZReader<R1, B>,
  f: (a: A, b: B) => C
) => ZReader<R & R1, C> = Mu.zipWith_

export const crossWith: <A, R1, B, C>(
  fb: ZReader<R1, B>,
  f: (a: A, b: B) => C
) => <R>(fa: ZReader<R, A>) => ZReader<R & R1, C> = Mu.zipWith

/*
 * -------------------------------------------
 * Apply
 * -------------------------------------------
 */

export const ap_: <R, A, R1, B>(fab: ZReader<R1, (a: A) => B>, fa: ZReader<R, A>) => ZReader<R & R1, B> = Mu.zap_

export const ap: <R, A>(fa: ZReader<R, A>) => <R1, B>(fab: ZReader<R1, (a: A) => B>) => ZReader<R & R1, B> = Mu.zap

export const apl_: <R, A, R1, B>(fa: ZReader<R, A>, fb: ZReader<R1, B>) => ZReader<R & R1, A> = Mu.zipl_

export const apl: <R1, B>(fb: ZReader<R1, B>) => <R, A>(fa: ZReader<R, A>) => ZReader<R & R1, A> = Mu.zipl

export const apr_: <R, A, R1, B>(fa: ZReader<R, A>, fb: ZReader<R1, B>) => ZReader<R & R1, B> = Mu.zipr_

export const apr: <R1, B>(fb: ZReader<R1, B>) => <R, A>(fa: ZReader<R, A>) => ZReader<R & R1, B> = Mu.zipr

/*
 * -------------------------------------------
 * Functor
 * -------------------------------------------
 */

export const map_: <R, A, B>(fa: ZReader<R, A>, f: (a: A) => B) => ZReader<R, B> = Mu.map_

export const map: <A, B>(f: (a: A) => B) => <R>(fa: ZReader<R, A>) => ZReader<R, B> = Mu.map

/*
 * -------------------------------------------
 * Monad
 * -------------------------------------------
 */

export const bind_: <R, A, R1, B>(ma: ZReader<R, A>, f: (a: A) => ZReader<R1, B>) => ZReader<R & R1, B> = Mu.bind_

export const bind: <A, R1, B>(f: (a: A) => ZReader<R1, B>) => <R>(ma: ZReader<R, A>) => ZReader<R & R1, B> = Mu.bind

export function flatten<R, R1, A>(mma: ZReader<R, ZReader<R1, A>>): ZReader<R & R1, A> {
  return bind_(mma, identity)
}

export const tap_: <R, A, R1, B>(ma: ZReader<R, A>, f: (a: A) => ZReader<R1, B>) => ZReader<R & R1, A> = Mu.tap_

export const tap: <A, R1, B>(f: (a: A) => ZReader<R1, B>) => <R>(ma: ZReader<R, A>) => ZReader<R & R1, A> = Mu.tap

/*
 * -------------------------------------------
 * Category
 * -------------------------------------------
 */

export function compose_<R, A, B>(ra: ZReader<R, A>, ab: ZReader<A, B>): ZReader<R, B> {
  return bind_(ra, (a) => giveAll_(ab, a))
}

export function compose<A, B>(ab: ZReader<A, B>): <R>(ra: ZReader<R, A>) => ZReader<R, B> {
  return (ra) => compose_(ra, ab)
}

/*
 * -------------------------------------------
 * Profunctor
 * -------------------------------------------
 */

export function dimap_<R, A, Q, B>(pa: ZReader<R, A>, f: (q: Q) => R, g: (a: A) => B): ZReader<Q, B> {
  return pipe(pa, gives(f), map(g))
}

export function dimap<R, A, Q, B>(f: (q: Q) => R, g: (a: A) => B): (pa: ZReader<R, A>) => ZReader<Q, B> {
  return (pa) => dimap_(pa, f, g)
}

/*
 * -------------------------------------------
 * Instances
 * -------------------------------------------
 */

export const MonadEnv: P.MonadEnv<[HKT.URI<ZReaderURI>], V> = P.MonadEnv({
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

export { ZReaderURI } from './Modules'
