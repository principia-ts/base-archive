import type { Chunk } from './Chunk'
import type { IO } from './IO'

export const IOURI = 'IO'
export type IOURI = typeof IOURI

export const ChunkURI = 'Chunk'
export type ChunkURI = typeof ChunkURI

declare module '@principia/base/HKT' {
  interface URItoKind<FC, TC, N, K, Q, W, X, I, S, R, E, A> {
    [IOURI]: IO<R, E, A>
    [ChunkURI]: Chunk<A>
  }
}
