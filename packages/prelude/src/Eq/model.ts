export const URI = "Eq";
export type URI = typeof URI;

export interface Eq<A> {
  readonly equals_: (x: A, y: A) => boolean;
  readonly equals: (y: A) => (x: A) => boolean;
}

declare module "../HKT" {
  interface URItoKind<FC, TC, N extends string, K, Q, W, X, I, S, R, E, A> {
    readonly [URI]: Eq<A>;
  }

  interface URItoKind1<TC, A> {
    readonly [URI]: Eq<A>;
  }
}
