export interface Chunk<A> extends Readonly<ArrayLike<A>>, Iterable<A> {}

export interface NonEmptyChunk<A> extends Readonly<ArrayLike<A>>, Iterable<A> {
  readonly 0: A;
}

export type TypedArray =
  | Uint8Array
  | Uint16Array
  | Uint32Array
  | Uint8ClampedArray
  | Int8Array
  | Int16Array
  | Int32Array;

export const URI = "Chunk";
export type URI = typeof URI;

declare module "@principia/prelude/HKT" {
  interface URItoKind<FC, TC, N, K, Q, W, X, I, S, R, E, A> {
    readonly [URI]: Chunk<A>;
  }
  interface URItoIndex<N, K> {
    readonly [URI]: number;
  }
}
