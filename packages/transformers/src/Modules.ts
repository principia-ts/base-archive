import type { StateIn, StateOut } from './StateT'
import type { Multi } from '@principia/base/Multi'

export const StateInURI = 'StateIn'
export type StateInURI = typeof StateInURI

export const StateOutURI = 'StateOut'
export type StateOutURI = typeof StateOutURI

export const MReaderURI = 'MReader'
export type MReaderURI = typeof MReaderURI

declare module '@principia/base/HKT' {
  interface URItoKind<FC, TC, N, K, Q, W, X, I, S, R, E, A> {
    [StateInURI]: StateIn<S, A>
    [StateOutURI]: StateOut<S, A>
    [MReaderURI]: Multi<never, unknown, never, R, never, A>
  }
}
