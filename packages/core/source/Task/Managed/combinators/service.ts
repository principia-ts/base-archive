import { flow } from "@principia/prelude";
import type { UnionToIntersection } from "@principia/prelude/Utils";

import type * as T from "../_internal/task";
import * as A from "../../../Array";
import type { Has, Tag } from "../../../Has";
import * as R from "../../../Record";
import { map_ } from "../functor";
import type { Managed } from "../model";
import { asks, asksM, asksManaged } from "../reader";

export const askService = <T>(t: Tag<T>): Managed<Has<T>, never, T> => asks(t.read);

export const asksService = <T>(t: Tag<T>) => <A>(f: (a: T) => A): Managed<Has<T>, never, A> => asks(flow(t.read, f));

export const asksServiceM = <T>(t: Tag<T>) => <R, E, A>(f: (a: T) => T.Task<R, E, A>): Managed<Has<T> & R, E, A> =>
   asksM(flow(t.read, f));

export const asksServiceManaged = <T>(t: Tag<T>) => <R, E, A>(
   f: (a: T) => Managed<R, E, A>
): Managed<Has<T> & R, E, A> => asksManaged(flow(t.read, f));

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
   asksM((r: UnionToIntersection<{ [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? Has<T> : unknown }[keyof SS]>) =>
      f(R.map_(s, (v) => r[v.key]) as any)
   );

/**
 * Access a record of services with the required Service Entries
 */
export const asksServicesManaged = <SS extends Record<string, Tag<any>>>(s: SS) => <
   R = unknown,
   E = never,
   B = unknown
>(
   f: (
      a: {
         [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? T : unknown;
      }
   ) => Managed<R, E, B>
) =>
   asksManaged(
      (r: UnionToIntersection<{ [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? Has<T> : unknown }[keyof SS]>) =>
         f(R.map_(s, (v) => r[v.key]) as any)
   );

export const asksServicesTM = <SS extends Tag<any>[]>(...s: SS) => <R = unknown, E = never, B = unknown>(
   f: (
      ...a: {
         [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? T : unknown;
      }
   ) => T.Task<R, E, B>
) =>
   asksM(
      (
         r: UnionToIntersection<
            {
               [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? Has<T> : never;
            }[keyof SS & number]
         >
      ) => f(...(A.map_(s, (v) => r[v.key]) as any))
   );

export const asksServicesTManaged = <SS extends Tag<any>[]>(...s: SS) => <R = unknown, E = never, B = unknown>(
   f: (
      ...a: {
         [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? T : unknown;
      }
   ) => Managed<R, E, B>
) =>
   asksManaged(
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
   asks(
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
   asks((r: UnionToIntersection<{ [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? Has<T> : unknown }[keyof SS]>) =>
      f(R.map_(s, (v) => r[v.key]) as any)
   );

/**
 * ```haskell
 * asService :: Tag a -> Managed r e a -> Managed r e (Has a)
 * ```
 *
 * Maps the success value of this Managed to a service.
 */
export const asService = <A>(tag: Tag<A>) => <R, E>(ma: Managed<R, E, A>) => map_(ma, tag.of);
