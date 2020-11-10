export interface Show<A> {
   readonly show: (a: A) => string;
}

export const URI = "Show";

export type URI = typeof URI;

declare module "../HKT" {
   interface URItoKind<FC, TC, N, K, Q, W, X, I, S, R, E, A> {
      readonly [URI]: Show<A>;
   }

   interface URItoKind1<TC, A> {
      readonly [URI]: Show<A>;
   }
}
