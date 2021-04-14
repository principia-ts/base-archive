import type { StateInURI, StateOutURI } from './Modules'
import type { Erase } from '@principia/base/util/types'

import * as HKT from '@principia/base/HKT'
import * as P from '@principia/base/typeclass'

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

export function getStateT<F extends HKT.URIS, C>(M: P.Monad<F, C>): StateT<F, C>
export function getStateT<F>(M: P.Monad<HKT.UHKT<F>>): StateT<HKT.UHKT<F>> {
  const map_: StateT<HKT.UHKT<F>>['map_'] = (fa, f) => (s) => M.map_(fa(s), ([a, s]) => [f(a), s])

  const crossWith_: StateT<HKT.UHKT<F>>['crossWith_'] = (fa, fb, f) => (s) =>
    M.bind_(fa(s), ([a, s1]) => M.map_(fb(s1), ([b, s2]) => [f(a, b), s2]))

  const bind_: StateT<HKT.UHKT<F>>['bind_'] = (ma, f) => (s) => M.bind_(ma(s), ([a, s]) => f(a)(s))

  return HKT.instance<StateT<HKT.UHKT<F>>>({
    ...P.Monad({
      map_,
      crossWith_,
      ap_: (fab, fa) => crossWith_(fab, fa, (f, a) => f(a)),
      unit: () => <S>(s: S) => M.pure([undefined, s] as [void, S]),
      pure: <A>(a: A) => <S>(s: S) => M.pure([a, s] as [A, S]),
      bind_
    }),
    get: () => (s) => M.pure([s, s]),
    put: (s) => () => M.pure([undefined, s]),
    modify: (f) => (s) => M.pure(f(s)),
    gets: (f) => (s) => M.pure([f(s), s])
  })
}
