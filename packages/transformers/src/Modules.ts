import type { StateIn, StateOut } from './StateT'
import type { Z } from '@principia/base/Z'

export const StateInURI = 'StateIn'
export type StateInURI = typeof StateInURI

export const StateOutURI = 'StateOut'
export type StateOutURI = typeof StateOutURI

declare module '@principia/base/HKT' {
  interface URItoKind<FC, TC, N, K, Q, W, X, I, S, R, E, A> {
    [StateInURI]: StateIn<S, A>
    [StateOutURI]: StateOut<S, A>
  }
}
