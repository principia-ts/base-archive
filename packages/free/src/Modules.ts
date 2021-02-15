import type { FreeSemiring } from './FreeSemiring'

export const FreeSemiringURI = 'FreeSemiring'
export type FreeSemiringURI = typeof FreeSemiringURI

declare module '@principia/base/HKT' {
  interface URItoKind<FC, TC, N, K, Q, W, X, I, S, R, E, A> {
    [FreeSemiringURI]: FreeSemiring<X, A>
  }
}
