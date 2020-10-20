import type * as HKT from "@principia/prelude/HKT";

/*
 * -------------------------------------------
 * Task Model
 * -------------------------------------------
 */

export interface Task<A> {
   (): Promise<A>;
}

export type InferA<T> = [T] extends [Task<infer A>] ? A : never;

export const URI = "Task";

export type URI = typeof URI;

export type V = HKT.Auto;

declare module "@principia/prelude/HKT" {
   interface URItoKind<FC, TC, N extends string, K, Q, W, X, I, S, R, E, A> {
      readonly [URI]: Task<A>;
   }
}
