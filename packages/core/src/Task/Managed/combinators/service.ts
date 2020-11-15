import { flow } from "@principia/prelude";
import type { UnionToIntersection } from "@principia/prelude/Utils";

import type * as T from "../_internal/task";
import * as A from "../../../Array/_core";
import type { Has, Tag } from "../../../Has";
import * as R from "../../../Record";
import { map_ } from "../functor";
import type { Managed } from "../model";
import { asks, asksM, asksManaged } from "../reader";

export function askService<T>(t: Tag<T>): Managed<Has<T>, never, T> {
   return asks(t.read);
}

export function asksService<T>(t: Tag<T>): <A>(f: (a: T) => A) => Managed<Has<T>, never, A> {
   return (f) => asks(flow(t.read, f));
}

export function asksServiceM<T>(t: Tag<T>): <R, E, A>(f: (a: T) => T.Task<R, E, A>) => Managed<Has<T> & R, E, A> {
   return (f) => asksM(flow(t.read, f));
}

export function asksServiceManaged<T>(
   t: Tag<T>
): <R, E, A>(f: (a: T) => Managed<R, E, A>) => Managed<Has<T> & R, E, A> {
   return (f) => asksManaged(flow(t.read, f));
}

/**
 * Access a record of services with the required Service Entries
 */
export function asksServicesM<SS extends Record<string, Tag<any>>>(
   s: SS
): <R = unknown, E = never, B = unknown>(
   f: (a: { [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? T : unknown }) => T.Task<R, E, B>
) => Managed<
   UnionToIntersection<{ [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? Has<T> : unknown }[keyof SS]> & R,
   E,
   B
> {
   return (f) =>
      asksM(
         (
            r: UnionToIntersection<
               {
                  [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? Has<T> : unknown;
               }[keyof SS]
            >
         ) => f(R.map_(s, (v) => r[v.key]) as any)
      );
}

/**
 * Access a record of services with the required Service Entries
 */
export function asksServicesManaged<SS extends Record<string, Tag<any>>>(
   s: SS
): <R = unknown, E = never, B = unknown>(
   f: (a: { [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? T : unknown }) => Managed<R, E, B>
) => Managed<
   UnionToIntersection<{ [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? Has<T> : unknown }[keyof SS]> & R,
   E,
   B
> {
   return (f) =>
      asksManaged(
         (
            r: UnionToIntersection<
               {
                  [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? Has<T> : unknown;
               }[keyof SS]
            >
         ) => f(R.map_(s, (v) => r[v.key]) as any)
      );
}

export function asksServicesTM<SS extends Tag<any>[]>(
   ...s: SS
): <R = unknown, E = never, B = unknown>(
   f: (...a: { [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? T : unknown }) => T.Task<R, E, B>
) => Managed<
   UnionToIntersection<{ [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? Has<T> : never }[keyof SS & number]> & R,
   E,
   B
> {
   return (f) =>
      asksM(
         (
            r: UnionToIntersection<
               {
                  [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? Has<T> : never;
               }[keyof SS & number]
            >
         ) => f(...(A.map_(s, (v) => r[v.key]) as any))
      );
}

export function asksServicesTManaged<SS extends Tag<any>[]>(
   ...s: SS
): <R = unknown, E = never, B = unknown>(
   f: (...a: { [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? T : unknown }) => Managed<R, E, B>
) => Managed<
   UnionToIntersection<{ [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? Has<T> : never }[keyof SS & number]> & R,
   E,
   B
> {
   return (f) =>
      asksManaged(
         (
            r: UnionToIntersection<
               {
                  [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? Has<T> : never;
               }[keyof SS & number]
            >
         ) => f(...(A.map_(s, (v) => r[v.key]) as any))
      );
}

export function asksServicesT<SS extends Tag<any>[]>(
   ...s: SS
): <B = unknown>(
   f: (...a: { [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? T : unknown }) => B
) => Managed<
   UnionToIntersection<{ [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? Has<T> : never }[keyof SS & number]>,
   never,
   B
> {
   return (f) =>
      asks(
         (
            r: UnionToIntersection<
               {
                  [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? Has<T> : never;
               }[keyof SS & number]
            >
         ) => f(...(A.map_(s, (v) => r[v.key]) as any))
      );
}

/**
 * Access a record of services with the required Service Entries
 */
export function asksServices<SS extends Record<string, Tag<any>>>(
   s: SS
): <B>(
   f: (a: { [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? T : unknown }) => B
) => Managed<
   UnionToIntersection<{ [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? Has<T> : unknown }[keyof SS]>,
   never,
   B
> {
   return (f) =>
      asks((r: UnionToIntersection<{ [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? Has<T> : unknown }[keyof SS]>) =>
         f(R.map_(s, (v) => r[v.key]) as any)
      );
}

/**
 * ```haskell
 * asService :: Tag a -> Managed r e a -> Managed r e (Has a)
 * ```
 *
 * Maps the success value of this Managed to a service.
 */
export function asService<A>(tag: Tag<A>): <R, E>(ma: Managed<R, E, A>) => Managed<R, E, Has<A>> {
   return (ma) => map_(ma, tag.of);
}
