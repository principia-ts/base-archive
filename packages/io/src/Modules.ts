import type { IO } from './IO'

export const IOURI = 'IO'
export type IOURI = typeof IOURI

declare module '@principia/base/HKT' {
  interface URItoKind<FC, TC, N, K, Q, W, X, I, S, R, E, A> {
    [IOURI]: IO<R, E, A>
  }
}
