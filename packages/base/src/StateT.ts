import type { StateInURI, StateOutURI } from './Modules'
import type * as P from './typeclass'
import type { Erase } from './util/types'

import { tuple } from './Function'
import * as HKT from './HKT'

/*
 * -------------------------------------------
 * Model
 * -------------------------------------------
 */

export type StateIn<S, A> = (s: S) => A

export type StateOut<S, A> = readonly [A, S]

export type V<C> = HKT.Unfix<Erase<HKT.Strip<C, 'S'>, HKT.Auto>, 'S'> & HKT.V<'S', '_'>

export interface StateT<M extends HKT.URIS, C = HKT.Auto>
  extends P.MonadState<[HKT.URI<StateInURI>, ...M, HKT.URI<StateOutURI>], V<C>> {}

export function getMonadStateT<F extends HKT.URIS, C>(M: P.Monad<F, C>): StateT<F, C>
export function getMonadStateT<F>(M: P.Monad<HKT.UHKT<F>>): StateT<HKT.UHKT<F>> {
  const map_: StateT<HKT.UHKT<F>>['map_'] = (fa, f) => (s) => M.map_(fa(s), ([a, s]) => [f(a), s])

  const crossWith_: StateT<HKT.UHKT<F>>['crossWith_'] = (fa, fb, f) => (s) =>
    M.bind_(fa(s), ([a, s1]) => M.map_(fb(s1), ([b, s2]) => [f(a, b), s2]))

  const ap_: StateT<HKT.UHKT<F>>['ap_'] = (fab, fa) => crossWith_(fab, fa, (f, a) => f(a))

  const bind_: StateT<HKT.UHKT<F>>['bind_'] = (ma, f) => (s) => M.bind_(ma(s), ([a, s]) => f(a)(s))

  const flatten: StateT<HKT.UHKT<F>>['flatten'] = (mma) => (s) => M.bind_(mma(s), ([f, s2]) => f(s2))

  return HKT.instance<StateT<HKT.UHKT<F>>>({
    invmap_: (fa, f, _) => map_(fa, f),
    invmap: (f, _) => (fa) => map_(fa, f),
    map_,
    map: (f) => (fa) => map_(fa, f),
    crossWith_,
    crossWith: (fb, f) => (fa) => crossWith_(fa, fb, f),
    cross_: (fa, fb) => crossWith_(fa, fb, tuple),
    cross: (fb) => (fa) => crossWith_(fa, fb, tuple),
    ap_,
    ap: (fa) => (fab) => ap_(fab, fa),
    unit: () => (s) => M.map_(M.unit(), () => [undefined, s]),
    pure: (a) => (s) => M.pure([a, s]),
    bind_,
    bind: (f) => (ma) => bind_(ma, f),
    flatten,
    get: () => (s) => M.pure([s, s]),
    put: (s) => () => M.pure([undefined, s]),
    modify: (f) => (s) => M.pure([undefined, f(s)]),
    gets: (f) => (s) => M.pure([f(s), s])
  })
}
