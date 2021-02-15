import type { IO } from './IO'
import type { Multi } from './Multi'
import type { Sync } from './Sync'

export const IOURI = 'IO'
export type IOURI = typeof IOURI

export const MultiURI = 'Multi'
export type MultiURI = typeof MultiURI

export const SyncURI = 'Sync'
export type SyncURI = typeof SyncURI

declare module '@principia/base/HKT' {
  interface URItoKind<FC, TC, N, K, Q, W, X, I, S, R, E, A> {
    [IOURI]: IO<R, E, A>
    [SyncURI]: Sync<R, E, A>
    [MultiURI]: Multi<W, S, S, R, E, A>
  }
}
