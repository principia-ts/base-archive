import type * as P from './typeclass'
import type { Erase } from './util/types'

import { tuple } from './Function'
import * as HKT from './HKT'

/*
 * -------------------------------------------
 * Model
 * -------------------------------------------
 */

export const StateInURI = 'StateIn'
export type StateInURI = typeof StateInURI

export const StateOutURI = 'StateOut'
export type StateOutURI = typeof StateOutURI

export type StateIn<S, A> = (s: S) => A

export type StateOut<S, A> = readonly [A, S]

declare module './HKT' {
  interface URItoKind<FC, TC, N, K, Q, W, X, I, S, R, E, A> {
    readonly [StateInURI]: (s: S) => A
    readonly [StateOutURI]: readonly [A, S]
  }
}

export type V<C> = HKT.Unfix<Erase<HKT.Strip<C, 'S'>, HKT.Auto>, 'S'> & HKT.V<'S', '_'>

export type StateTURI<F extends HKT.URIS> = HKT.PrependURI<StateInURI, HKT.AppendURI<F, StateOutURI>>

export interface StateT<M extends HKT.URIS, C = HKT.Auto> extends P.MonadState<StateTURI<M>, V<C>> {}

export function getMonadStateT<F extends HKT.URIS, C>(M: P.Monad<F, C>): P.MonadState<StateTURI<F>, V<C>>
export function getMonadStateT<F>(M: P.Monad<HKT.UHKT<F>>): P.MonadState<StateTURI<HKT.UHKT<F>>, V<HKT.Auto>> {
  const map_: P.MapFn_<StateTURI<HKT.UHKT<F>>, V<HKT.Auto>> = (fa, f) => (s) => M.map_(fa(s), ([a, s]) => [f(a), s])

  const map2_: P.Map2Fn_<StateTURI<HKT.UHKT<F>>, V<HKT.Auto>> = (fa, fb, f) => (s) =>
    M.chain_(fa(s), ([a, s1]) => M.map_(fb(s1), ([b, s2]) => [f(a, b), s2]))

  const ap_: P.ApFn_<StateTURI<HKT.UHKT<F>>, V<HKT.Auto>> = (fab, fa) => map2_(fab, fa, (f, a) => f(a))

  const chain_: P.ChainFn_<StateTURI<HKT.UHKT<F>>, V<HKT.Auto>> = (ma, f) => (s) => M.chain_(ma(s), ([a, s]) => f(a)(s))

  const flatten: P.FlattenFn<StateTURI<HKT.UHKT<F>>, V<HKT.Auto>> = (mma) => (s) => M.chain_(mma(s), ([f, s2]) => f(s2))

  return HKT.instance<StateT<HKT.UHKT<F>>>({
    imap_: (fa, f, _) => map_(fa, f),
    imap: (f, _) => (fa) => map_(fa, f),
    map_,
    map: (f) => (fa) => map_(fa, f),
    map2_,
    map2: (fb, f) => (fa) => map2_(fa, fb, f),
    product_: (fa, fb) => map2_(fa, fb, tuple),
    product: (fb) => (fa) => map2_(fa, fb, tuple),
    ap_,
    ap: (fa) => (fab) => ap_(fab, fa),
    unit: () => (s) => M.map_(M.unit(), () => [undefined, s]),
    pure: (a) => (s) => M.pure([a, s]),
    chain_,
    chain: (f) => (ma) => chain_(ma, f),
    flatten,
    get: () => (s) => M.pure([s, s]),
    put: (s) => () => M.pure([undefined, s]),
    modify: (f) => (s) => M.pure([undefined, f(s)]),
    gets: (f) => (s) => M.pure([f(s), s])
  })
}
