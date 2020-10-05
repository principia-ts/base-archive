export const URI = "Eq";
export type URI = typeof URI;

export interface Eq<A> {
   readonly equals: (x: A) => (y: A) => boolean;
}

declare module "../HKT" {
   interface URItoKind<FC, TC, N extends string, K, Q, W, X, I, S, R, E, A> {
      [URI]: Eq<A>;
   }
}
