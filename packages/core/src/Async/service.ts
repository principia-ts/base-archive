import type { UnionToIntersection } from "@principia/prelude/Utils";

import * as A from "../Array/_core";
import { pipe } from "../Function";
import type { Has, Region, Tag } from "../Has";
import { mergeEnvironments, tag } from "../Has";
import * as R from "../Record";
import { pure } from "./applicative-seq";
import { map_ } from "./functor";
import type { Async, URAsync } from "./model";
import { chain_ } from "./monad";
import { asks, asksM, give, giveAll_ } from "./reader";

/**
 * Access a record of services with the required Service Entries
 */
export function asksServicesM<SS extends Record<string, Tag<any>>>(
  s: SS
): <R = unknown, E = never, B = unknown>(
  f: (a: { [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? T : unknown }) => Async<R, E, B>
) => Async<
  R &
    UnionToIntersection<
      { [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? Has<T> : unknown }[keyof SS]
    >,
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

export function asksServicesTM<SS extends Tag<any>[]>(
  ...s: SS
): <R = unknown, E = never, B = unknown>(
  f: (...a: { [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? T : unknown }) => Async<R, E, B>
) => Async<
  R &
    UnionToIntersection<
      { [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? Has<T> : never }[keyof SS & number]
    >,
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

export function asksServicesT<SS extends Tag<any>[]>(
  ...s: SS
): <B = unknown>(
  f: (...a: { [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? T : unknown }) => B
) => URAsync<
  UnionToIntersection<
    { [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? Has<T> : never }[keyof SS & number]
  >,
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
) => URAsync<
  UnionToIntersection<
    { [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? Has<T> : unknown }[keyof SS]
  >,
  B
> {
  return (f) =>
    asks(
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
 * Access a service with the required Service Entry
 */
export function asksServiceM<T>(
  s: Tag<T>
): <R, E, B>(f: (a: T) => Async<R, E, B>) => Async<R & Has<T>, E, B> {
  return (f) => asksM((r: Has<T>) => f(r[s.key as any]));
}

/**
 * Access a service with the required Service Entry
 */
export function asksServiceF<T>(
  s: Tag<T>
): <
  K extends keyof T &
    { [k in keyof T]: T[k] extends (...args: any[]) => Async<any, any, any> ? k : never }[keyof T]
>(
  k: K
) => (
  ...args: T[K] extends (...args: infer ARGS) => Async<any, any, any> ? ARGS : unknown[]
) => T[K] extends (...args: any[]) => Async<infer R, infer E, infer A>
  ? Async<R & Has<T>, E, A>
  : unknown[] {
  return (k) => (...args) => asksServiceM(s)((t) => (t[k] as any)(...args)) as any;
}

/**
 * Access a service with the required Service Entry
 */
export function asksService<T>(s: Tag<T>): <B>(f: (a: T) => B) => Async<Has<T>, never, B> {
  return (f) => asksServiceM(s)((a) => pure(f(a)));
}

/**
 * Access a service with the required Service Entry
 */
export function askService<T>(s: Tag<T>): Async<Has<T>, never, T> {
  return asksServiceM(s)((a) => pure(a));
}

/**
 * Provides the service with the required Service Entry, depends on global HasRegistry
 */
export function giveServiceM<T>(_: Tag<T>) {
  return <R, E>(f: Async<R, E, T>) => <R1, E1, A1>(
    ma: Async<R1 & Has<T>, E1, A1>
  ): Async<R & R1, E | E1, A1> =>
    asksM((r: R & R1) => chain_(f, (t) => giveAll_(ma, mergeEnvironments(_, r, t))));
}

/**
 * Provides the service with the required Service Entry, depends on global HasRegistry
 */
export function giveService<T>(
  _: Tag<T>
): (f: T) => <R1, E1, A1>(ma: Async<R1 & Has<T>, E1, A1>) => Async<R1, E1, A1> {
  return (f) => (ma) => giveServiceM(_)(pure(f))(ma);
}

/**
 * Replaces the service with the required Service Entry, depends on global HasRegistry
 */
export function replaceServiceM<R, E, T>(
  _: Tag<T>,
  f: (_: T) => Async<R, E, T>
): <R1, E1, A1>(ma: Async<R1 & Has<T>, E1, A1>) => Async<R & R1 & Has<T>, E1 | E, A1> {
  return (ma) => asksServiceM(_)((t) => giveServiceM(_)(f(t))(ma));
}

/**
 * Replaces the service with the required Service Entry, depends on global HasRegistry
 */
export function replaceServiceM_<R, E, T, R1, E1, A1>(
  ma: Async<R1 & Has<T>, E1, A1>,
  _: Tag<T>,
  f: (_: T) => Async<R, E, T>
): Async<R & R1 & Has<T>, E | E1, A1> {
  return asksServiceM(_)((t) => giveServiceM(_)(f(t))(ma));
}

/**
 * Replaces the service with the required Service Entry, depends on global HasRegistry
 */
export function replaceService<T>(
  _: Tag<T>,
  f: (_: T) => T
): <R1, E1, A1>(ma: Async<R1 & Has<T>, E1, A1>) => Async<R1 & Has<T>, E1, A1> {
  return (ma) => asksServiceM(_)((t) => giveServiceM(_)(pure(f(t)))(ma));
}

/**
 * Replaces the service with the required Service Entry, depends on global HasRegistry
 */
export function replaceService_<R1, E1, A1, T>(
  ma: Async<R1 & Has<T>, E1, A1>,
  _: Tag<T>,
  f: (_: T) => T
): Async<R1 & Has<T>, E1, A1> {
  return asksServiceM(_)((t) => giveServiceM(_)(pure(f(t)))(ma));
}

export function region<K, T>(): Tag<Region<T, K>> {
  return tag<Region<T, K>>();
}

export function useRegion<K, T>(
  h: Tag<Region<T, K>>
): <R, E, A>(e: Async<R & T, E, A>) => Async<R & Has<Region<T, K>>, E, A> {
  return (e) => asksServiceM(h)((a) => pipe(e, give((a as any) as T)));
}

export function asksRegionM<K, T>(
  h: Tag<Region<T, K>>
): <R, E, A>(e: (_: T) => Async<R & T, E, A>) => Async<R & Has<Region<T, K>>, E, A> {
  return (e) => asksServiceM(h)((a) => pipe(asksM(e), give((a as any) as T)));
}

export function asksRegion<K, T>(
  h: Tag<Region<T, K>>
): <A>(e: (_: T) => A) => Async<Has<Region<T, K>>, never, A> {
  return (e) => asksServiceM(h)((a) => pipe(asks(e), give((a as any) as T)));
}

export function askRegion<K, T>(h: Tag<Region<T, K>>): Async<Has<Region<T, K>>, never, T> {
  return asksServiceM(h)((a) =>
    pipe(
      asks((r: T) => r),
      give((a as any) as T)
    )
  );
}

export function askServiceIn<A>(
  _: Tag<A>
): <K, T>(h: Tag<Region<Has<A> & T, K>>) => Async<Has<Region<Has<A> & T, K>>, never, A> {
  return (h) =>
    useRegion(h)(
      asksServiceM(_)((a) =>
        pipe(
          asks((r: A) => r),
          give((a as any) as A)
        )
      )
    );
}

export function asksServiceIn<A>(
  _: Tag<A>
): <K, T>(
  h: Tag<Region<Has<A> & T, K>>
) => <B>(f: (_: A) => B) => Async<Has<Region<Has<A> & T, K>>, never, B> {
  return (h) => (f) =>
    useRegion(h)(
      asksServiceM(_)((a) =>
        pipe(
          asks((r: A) => f(r)),
          give((a as any) as A)
        )
      )
    );
}

export function asksServiceInM<A>(
  _: Tag<A>
): <K, T>(
  h: Tag<Region<Has<A> & T, K>>
) => <R, E, B>(f: (_: A) => Async<R, E, B>) => Async<R & Has<Region<Has<A> & T, K>>, E, B> {
  return (h) => (f) =>
    useRegion(h)(
      asksServiceM(_)((a) =>
        pipe(
          asksM((r: A) => f(r)),
          give((a as any) as A)
        )
      )
    );
}

/**
 * ```haskell
 * asService :: Tag a -> IO r e a -> IO r e (Has a)
 * ```
 *
 * Maps the success value of this effect to a service.
 */
export function asService<A>(has: Tag<A>): <R, E>(fa: Async<R, E, A>) => Async<R, E, Has<A>> {
  return (fa) => map_(fa, has.of);
}
