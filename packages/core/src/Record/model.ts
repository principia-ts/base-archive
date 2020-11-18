import type * as HKT from "@principia/prelude/HKT";

export type ReadonlyRecord<K extends string, T> = Readonly<Record<K, T>>;

export type InferRecordType<T extends ReadonlyRecord<any, any>> = T extends {
  readonly [k in keyof T]: infer A;
}
  ? A
  : never;

export const URI = "Record";

export type URI = typeof URI;

export type V = HKT.Auto;

declare module "@principia/prelude/HKT" {
  interface URItoKind<FC, TC, N extends string, K, Q, W, X, I, S, R, E, A> {
    readonly [URI]: ReadonlyRecord<N, A>;
  }
  interface URItoIndex<N extends string, K> {
    readonly [URI]: N;
  }
}
