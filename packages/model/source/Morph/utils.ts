import * as R from "@principia/core/Record";
import type { UnionToIntersection } from "@principia/prelude/Utils";

export const assignFunction = <F extends Function, C>(ab: F, c: C): F & C => {
   const newF: typeof ab = ((...x: any[]) => ab(...x)) as any;
   return Object.assign(newF, c);
};

export type SelectKeyOfMatchingValues<KeyedValues, Constraint> = {
   [k in keyof KeyedValues]: KeyedValues[k] extends Constraint ? k : never;
}[keyof KeyedValues];

export const assignCallable = <C, F extends Function & C, D>(F: F, d: D): F & C & D =>
   assignFunction(F, Object.assign({}, F, d));

export const wrapFun = <A, B, X>(g: ((a: A) => B) & X): typeof g => ((x: any) => g(x)) as any;

export interface InhabitedTypes<Env, S, R, E, A> {
   _Env: (_: Env) => void;
   _S: S;
   _R: R;
   _E: E;
   _A: A;
}

export type InferA<X extends InhabitedTypes<any, any, any, any, any>> = X["_A"];

export type InferE<X extends InhabitedTypes<any, any, any, any, any>> = X["_E"];

export type InferR<X extends InhabitedTypes<any, any, any, any, any>> = X["_R"];

export type InferS<X extends InhabitedTypes<any, any, any, any, any>> = X["_S"];

export type InferEnv<X extends InhabitedTypes<any, any, any, any, any>> = Parameters<X["_Env"]>[0];

export const inhabitTypes = <Env, S, R, E, A, T>(t: T): T & InhabitedTypes<Env, S, R, E, A> =>
   t as T & InhabitedTypes<Env, S, R, E, A>;

type Function1 = (a: any) => any;

export type CacheType = <F extends Function1>(f: F) => F;

export function cacheUnaryFunction<F extends Function1>(f: F) {
   type K = F extends (a: infer K) => any ? K : any;
   type V = F extends (a: any) => infer V ? V : any;
   const cache = new Map<K, V>();
   const r = (key: K): V => {
      const res = cache.get(key);
      if (res !== undefined) {
         return res;
      } else {
         const v = f(key);
         cache.set(key, v);
         return v;
      }
   };
   return r as F;
}

export const mapRecord = <Dic extends { [k in keyof Dic]: any }, B>(
   d: Dic,
   f: (v: Dic[keyof Dic]) => B
): { [k in keyof Dic]: B } => R.map_(d, f) as { [k in keyof Dic]: B };

export const projectField = <T extends R.ReadonlyRecord<any, R.ReadonlyRecord<any, any>>>(t: T) => <
   K extends keyof T[keyof T]
>(
   k: K
): {
   [q in keyof T]: T[q][K];
} =>
   R.map_(t, (p) => p[k]) as {
      [q in keyof T]: T[q][K];
   };

export const projectFieldWithEnv = <T extends R.ReadonlyRecord<any, (e: R) => R.ReadonlyRecord<any, any>>, R>(
   t: T,
   env: R
) => <K extends keyof ReturnType<T[keyof T]>>(
   k: K
): {
   [q in keyof T]: ReturnType<T[q]>[K];
} =>
   R.map_(t, (p) => p(env)[k]) as {
      [q in keyof T]: ReturnType<T[q]>[K];
   };

export const projectWithEnv = <T extends R.ReadonlyRecord<any, (_: Env) => R.ReadonlyRecord<string, any>>, Env>(
   t: T,
   env: Env
): { [K in keyof T]: ReturnType<T[K]> } => R.map_(t, (p) => p(env)) as any;

export type TupleToUnion<T extends unknown[]> = { [P in keyof T]: T[P] } extends {
   [key: number]: infer V;
}
   ? V
   : never;
export type TupleToIntersection<T extends unknown[]> = UnionToIntersection<TupleToUnion<T>>;

export function merge<R extends unknown[]>(...x: [...R]): TupleToIntersection<[...R]> {
   return Object.assign({}, ...x);
}
