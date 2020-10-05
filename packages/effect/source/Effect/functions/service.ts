import * as A from "@principia/core/Array";
import { pipe } from "@principia/core/Function";
import * as R from "@principia/core/Record";
import { UnionToIntersection } from "@principia/core/Utils";

import { Has, has, mergeEnvironments, Region, Tag } from "../../Has";
import * as T from "../core";

/**
 * Access a record of services with the required Service Entries
 */
export function accessServicesM<SS extends Record<string, Tag<any>>>(s: SS) {
   return <R = unknown, E = never, B = unknown>(
      f: (
         a: {
            [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? T : unknown;
         }
      ) => T.Effect<R, E, B>
   ) =>
      T.accessM(
         (
            r: UnionToIntersection<
               {
                  [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? Has<T> : unknown;
               }[keyof SS]
            >
         ) => f(R._map(s, (v) => r[v.key]) as any)
      );
}

export const accessServicesTM = <SS extends Tag<any>[]>(...s: SS) => <
   S,
   R = unknown,
   E = never,
   B = unknown
>(
   f: (
      ...a: {
         [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? T : unknown;
      }
   ) => T.Effect<R, E, B>
) =>
   T.accessM(
      (
         r: UnionToIntersection<
            {
               [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? Has<T> : never;
            }[keyof SS & number]
         >
      ) => f(...(A._map(s, (v) => r[v.key]) as any))
   );

export function accessServicesT<SS extends Tag<any>[]>(...s: SS) {
   return <B = unknown>(
      f: (
         ...a: {
            [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? T : unknown;
         }
      ) => B
   ) =>
      T.access(
         (
            r: UnionToIntersection<
               {
                  [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? Has<T> : never;
               }[keyof SS & number]
            >
         ) => f(...(A._map(s, (v) => r[v.key]) as any))
      );
}

/**
 * Access a record of services with the required Service Entries
 */
export function accessServices<SS extends Record<string, Tag<any>>>(s: SS) {
   return <B>(
      f: (
         a: {
            [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? T : unknown;
         }
      ) => B
   ) =>
      T.access(
         (
            r: UnionToIntersection<
               {
                  [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? Has<T> : unknown;
               }[keyof SS]
            >
         ) => f(R._map(s, (v) => r[v.key]) as any)
      );
}

/**
 * Access a service with the required Service Entry
 */
export function accessServiceM<T>(s: Tag<T>) {
   return <R, E, B>(f: (a: T) => T.Effect<R, E, B>) => T.accessM((r: Has<T>) => f(r[s.key as any]));
}

/**
 * Access a service with the required Service Entry
 */
export function accessServiceF<T>(s: Tag<T>) {
   return <
      K extends keyof T &
         {
            [k in keyof T]: T[k] extends (...args: any[]) => T.Effect<any, any, any> ? k : never;
         }[keyof T]
   >(
      k: K
   ) => (
      ...args: T[K] extends (...args: infer ARGS) => T.Effect<any, any, any> ? ARGS : unknown[]
   ): T[K] extends (...args: any[]) => T.Effect<infer R, infer E, infer A>
      ? T.Effect<R & Has<T>, E, A>
      : unknown[] => accessServiceM(s)((t) => (t[k] as any)(...args)) as any;
}

/**
 * Access a service with the required Service Entry
 */
export function accessService<T>(s: Tag<T>) {
   return <B>(f: (a: T) => B) => accessServiceM(s)((a) => T.pure(f(a)));
}

/**
 * Access a service with the required Service Entry
 */
export function readService<T>(s: Tag<T>) {
   return accessServiceM(s)((a) => T.pure(a));
}

/**
 * Provides the service with the required Service Entry, depends on global HasRegistry
 */
export function provideServiceM<T>(_: Tag<T>) {
   return <R, E>(f: T.Effect<R, E, T>) => <R1, E1, A1>(
      ma: T.Effect<R1 & Has<T>, E1, A1>
   ): T.Effect<R & R1, E | E1, A1> =>
      T.accessM((r: R & R1) => T._chain(f, (t) => T._provideAll(ma, mergeEnvironments(_, r, t))));
}

/**
 * Provides the service with the required Service Entry, depends on global HasRegistry
 */
export function provideService<T>(_: Tag<T>) {
   return (f: T) => <R1, E1, A1>(ma: T.Effect<R1 & Has<T>, E1, A1>): T.Effect<R1, E1, A1> =>
      provideServiceM(_)(T.pure(f))(ma);
}

/**
 * Replaces the service with the required Service Entry, depends on global HasRegistry
 */
export function replaceServiceM<R, E, T>(_: Tag<T>, f: (_: T) => T.Effect<R, E, T>) {
   return <R1, E1, A1>(ma: T.Effect<R1 & Has<T>, E1, A1>): T.Effect<R & R1 & Has<T>, E | E1, A1> =>
      accessServiceM(_)((t) => provideServiceM(_)(f(t))(ma));
}

/**
 * Replaces the service with the required Service Entry, depends on global HasRegistry
 */
export function replaceServiceM_<R, E, T, R1, E1, A1>(
   ma: T.Effect<R1 & Has<T>, E1, A1>,
   _: Tag<T>,
   f: (_: T) => T.Effect<R, E, T>
): T.Effect<R & R1 & Has<T>, E | E1, A1> {
   return accessServiceM(_)((t) => provideServiceM(_)(f(t))(ma));
}

/**
 * Replaces the service with the required Service Entry, depends on global HasRegistry
 */
export function replaceService<T>(_: Tag<T>, f: (_: T) => T) {
   return <R1, E1, A1>(ma: T.Effect<R1 & Has<T>, E1, A1>): T.Effect<R1 & Has<T>, E1, A1> =>
      accessServiceM(_)((t) => provideServiceM(_)(T.pure(f(t)))(ma));
}

/**
 * Replaces the service with the required Service Entry, depends on global HasRegistry
 */
export function replaceService_<R1, E1, A1, T>(
   ma: T.Effect<R1 & Has<T>, E1, A1>,
   _: Tag<T>,
   f: (_: T) => T
): T.Effect<R1 & Has<T>, E1, A1> {
   return accessServiceM(_)((t) => provideServiceM(_)(T.pure(f(t)))(ma));
}

export function region<K, T>(): Tag<Region<T, K>> {
   return has<Region<T, K>>();
}

export function useRegion<K, T>(h: Tag<Region<T, K>>) {
   return <R, E, A>(e: T.Effect<R & T, E, A>) =>
      accessServiceM(h)((a) => pipe(e, T.provide((a as any) as T)));
}

export function accessRegionM<K, T>(h: Tag<Region<T, K>>) {
   return <R, E, A>(e: (_: T) => T.Effect<R & T, E, A>) =>
      accessServiceM(h)((a) => pipe(T.accessM(e), T.provide((a as any) as T)));
}

export function accessRegion<K, T>(h: Tag<Region<T, K>>) {
   return <A>(e: (_: T) => A) =>
      accessServiceM(h)((a) => pipe(T.access(e), T.provide((a as any) as T)));
}

export function readRegion<K, T>(h: Tag<Region<T, K>>) {
   return accessServiceM(h)((a) =>
      pipe(
         T.access((r: T) => r),
         T.provide((a as any) as T)
      )
   );
}

export function readServiceIn<A>(_: Tag<A>) {
   return <K, T>(h: Tag<Region<Has<A> & T, K>>) =>
      useRegion(h)(
         accessServiceM(_)((a) =>
            pipe(
               T.access((r: A) => r),
               T.provide((a as any) as A)
            )
         )
      );
}

export function accessServiceIn<A>(_: Tag<A>) {
   return <K, T>(h: Tag<Region<Has<A> & T, K>>) => <B>(f: (_: A) => B) =>
      useRegion(h)(
         accessServiceM(_)((a) =>
            pipe(
               T.access((r: A) => f(r)),
               T.provide((a as any) as A)
            )
         )
      );
}

export function accessServiceInM<A>(_: Tag<A>) {
   return <K, T>(h: Tag<Region<Has<A> & T, K>>) => <R, E, B>(f: (_: A) => T.Effect<R, E, B>) =>
      useRegion(h)(
         accessServiceM(_)((a) =>
            pipe(
               T.accessM((r: A) => f(r)),
               T.provide((a as any) as A)
            )
         )
      );
}
