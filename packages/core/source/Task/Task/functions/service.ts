import type { UnionToIntersection } from "@principia/prelude/Utils";

import * as A from "../../../Array";
import { pipe } from "../../../Function";
import * as R from "../../../Record";
import type { Has, Region, Tag } from "../../Has";
import { has, mergeEnvironments } from "../../Has";
import * as T from "../core";

/**
 * Access a record of services with the required Service Entries
 */
export const asksServicesM = <SS extends Record<string, Tag<any>>>(s: SS) => <R = unknown, E = never, B = unknown>(
   f: (
      a: {
         [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? T : unknown;
      }
   ) => T.Task<R, E, B>
) =>
   T.asksM((r: UnionToIntersection<{ [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? Has<T> : unknown }[keyof SS]>) =>
      f(R.map_(s, (v) => r[v.key]) as any)
   );

export const asksServicesTM = <SS extends Tag<any>[]>(...s: SS) => <R = unknown, E = never, B = unknown>(
   f: (
      ...a: {
         [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? T : unknown;
      }
   ) => T.Task<R, E, B>
) =>
   T.asksM(
      (
         r: UnionToIntersection<
            {
               [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? Has<T> : never;
            }[keyof SS & number]
         >
      ) => f(...(A.map_(s, (v) => r[v.key]) as any))
   );

export const asksServicesT = <SS extends Tag<any>[]>(...s: SS) => <B = unknown>(
   f: (
      ...a: {
         [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? T : unknown;
      }
   ) => B
) =>
   T.asks(
      (
         r: UnionToIntersection<
            {
               [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? Has<T> : never;
            }[keyof SS & number]
         >
      ) => f(...(A.map_(s, (v) => r[v.key]) as any))
   );

/**
 * Access a record of services with the required Service Entries
 */
export const asksServices = <SS extends Record<string, Tag<any>>>(s: SS) => <B>(
   f: (
      a: {
         [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? T : unknown;
      }
   ) => B
) =>
   T.asks((r: UnionToIntersection<{ [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? Has<T> : unknown }[keyof SS]>) =>
      f(R.map_(s, (v) => r[v.key]) as any)
   );

/**
 * Access a service with the required Service Entry
 */
export const asksServiceM = <T>(s: Tag<T>) => <R, E, B>(f: (a: T) => T.Task<R, E, B>) =>
   T.asksM((r: Has<T>) => f(r[s.key as any]));

/**
 * Access a service with the required Service Entry
 */
export const asksServiceF = <T>(s: Tag<T>) => <
   K extends keyof T &
      {
         [k in keyof T]: T[k] extends (...args: any[]) => T.Task<any, any, any> ? k : never;
      }[keyof T]
>(
   k: K
) => (
   ...args: T[K] extends (...args: infer ARGS) => T.Task<any, any, any> ? ARGS : unknown[]
): T[K] extends (...args: any[]) => T.Task<infer R, infer E, infer A> ? T.Task<R & Has<T>, E, A> : unknown[] =>
   asksServiceM(s)((t) => (t[k] as any)(...args)) as any;

/**
 * Access a service with the required Service Entry
 */
export const asksService = <T>(s: Tag<T>) => <B>(f: (a: T) => B) => asksServiceM(s)((a) => T.pure(f(a)));

/**
 * Access a service with the required Service Entry
 */
export const askService = <T>(s: Tag<T>) => asksServiceM(s)((a) => T.pure(a));

/**
 * Provides the service with the required Service Entry, depends on global HasRegistry
 */
export const giveServiceM = <T>(_: Tag<T>) => <R, E>(f: T.Task<R, E, T>) => <R1, E1, A1>(
   ma: T.Task<R1 & Has<T>, E1, A1>
): T.Task<R & R1, E | E1, A1> => T.asksM((r: R & R1) => T.chain_(f, (t) => T.giveAll_(ma, mergeEnvironments(_, r, t))));

/**
 * Provides the service with the required Service Entry, depends on global HasRegistry
 */
export const giveService = <T>(_: Tag<T>) => (f: T) => <R1, E1, A1>(
   ma: T.Task<R1 & Has<T>, E1, A1>
): T.Task<R1, E1, A1> => giveServiceM(_)(T.pure(f))(ma);

/**
 * Replaces the service with the required Service Entry, depends on global HasRegistry
 */
export const replaceServiceM = <R, E, T>(_: Tag<T>, f: (_: T) => T.Task<R, E, T>) => <R1, E1, A1>(
   ma: T.Task<R1 & Has<T>, E1, A1>
): T.Task<R & R1 & Has<T>, E | E1, A1> => asksServiceM(_)((t) => giveServiceM(_)(f(t))(ma));

/**
 * Replaces the service with the required Service Entry, depends on global HasRegistry
 */
export const replaceServiceM_ = <R, E, T, R1, E1, A1>(
   ma: T.Task<R1 & Has<T>, E1, A1>,
   _: Tag<T>,
   f: (_: T) => T.Task<R, E, T>
): T.Task<R & R1 & Has<T>, E | E1, A1> => asksServiceM(_)((t) => giveServiceM(_)(f(t))(ma));

/**
 * Replaces the service with the required Service Entry, depends on global HasRegistry
 */
export const replaceService = <T>(_: Tag<T>, f: (_: T) => T) => <R1, E1, A1>(
   ma: T.Task<R1 & Has<T>, E1, A1>
): T.Task<R1 & Has<T>, E1, A1> => asksServiceM(_)((t) => giveServiceM(_)(T.pure(f(t)))(ma));

/**
 * Replaces the service with the required Service Entry, depends on global HasRegistry
 */
export const replaceService_ = <R1, E1, A1, T>(
   ma: T.Task<R1 & Has<T>, E1, A1>,
   _: Tag<T>,
   f: (_: T) => T
): T.Task<R1 & Has<T>, E1, A1> => asksServiceM(_)((t) => giveServiceM(_)(T.pure(f(t)))(ma));

export const region = <K, T>(): Tag<Region<T, K>> => has<Region<T, K>>();

export const useRegion = <K, T>(h: Tag<Region<T, K>>) => <R, E, A>(e: T.Task<R & T, E, A>) =>
   asksServiceM(h)((a) => pipe(e, T.give((a as any) as T)));

export const asksRegionM = <K, T>(h: Tag<Region<T, K>>) => <R, E, A>(e: (_: T) => T.Task<R & T, E, A>) =>
   asksServiceM(h)((a) => pipe(T.asksM(e), T.give((a as any) as T)));

export const asksRegion = <K, T>(h: Tag<Region<T, K>>) => <A>(e: (_: T) => A) =>
   asksServiceM(h)((a) => pipe(T.asks(e), T.give((a as any) as T)));

export const askRegion = <K, T>(h: Tag<Region<T, K>>) =>
   asksServiceM(h)((a) =>
      pipe(
         T.asks((r: T) => r),
         T.give((a as any) as T)
      )
   );

export const askServiceIn = <A>(_: Tag<A>) => <K, T>(h: Tag<Region<Has<A> & T, K>>) =>
   useRegion(h)(
      asksServiceM(_)((a) =>
         pipe(
            T.asks((r: A) => r),
            T.give((a as any) as A)
         )
      )
   );

export const asksServiceIn = <A>(_: Tag<A>) => <K, T>(h: Tag<Region<Has<A> & T, K>>) => <B>(f: (_: A) => B) =>
   useRegion(h)(
      asksServiceM(_)((a) =>
         pipe(
            T.asks((r: A) => f(r)),
            T.give((a as any) as A)
         )
      )
   );

export const asksServiceInM = <A>(_: Tag<A>) => <K, T>(h: Tag<Region<Has<A> & T, K>>) => <R, E, B>(
   f: (_: A) => T.Task<R, E, B>
) =>
   useRegion(h)(
      asksServiceM(_)((a) =>
         pipe(
            T.asksM((r: A) => f(r)),
            T.give((a as any) as A)
         )
      )
   );

/**
 * ```haskell
 * asService :: Tag a -> Task r e a -> Task r e (Has a)
 * ```
 *
 * Maps the success value of this effect to a service.
 */
export const asService = <A>(has: Tag<A>) => <R, E>(fa: T.Task<R, E, A>) => T.map_(fa, has.of);
