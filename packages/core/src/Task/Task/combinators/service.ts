import type { UnionToIntersection } from "@principia/prelude/Utils";

import * as T from "../_core";
import * as A from "../../../Array/_core";
import { pipe } from "../../../Function";
import type { Has, Region, Tag } from "../../../Has";
import { mergeEnvironments, tag } from "../../../Has";
import * as R from "../../../Record";

/**
 * Access a record of services with the required Service Entries
 */
export function asksServicesM<SS extends Record<string, Tag<any>>>(
  s: SS
): <R = unknown, E = never, B = unknown>(
  f: (a: { [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? T : unknown }) => T.Task<R, E, B>
) => T.Task<
  R &
    UnionToIntersection<
      { [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? Has<T> : unknown }[keyof SS]
    >,
  E,
  B
> {
  return (f) =>
    T.asksM(
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
) => T.Task<
  R &
    UnionToIntersection<
      { [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? Has<T> : never }[keyof SS & number]
    >,
  E,
  B
> {
  return (f) =>
    T.asksM(
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
) => T.RIO<
  UnionToIntersection<
    { [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? Has<T> : never }[keyof SS & number]
  >,
  B
> {
  return (f) =>
    T.asks(
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
) => T.RIO<
  UnionToIntersection<
    { [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? Has<T> : unknown }[keyof SS]
  >,
  B
> {
  return (f) =>
    T.asks(
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
): <R, E, B>(f: (a: T) => T.Task<R, E, B>) => T.Task<R & Has<T>, E, B> {
  return (f) => T.asksM((r: Has<T>) => f(r[s.key as any]));
}

/**
 * Access a service with the required Service Entry
 */
export function asksServiceF<T>(
  s: Tag<T>
): <
  K extends keyof T &
    { [k in keyof T]: T[k] extends (...args: any[]) => T.Task<any, any, any> ? k : never }[keyof T]
>(
  k: K
) => (
  ...args: T[K] extends (...args: infer ARGS) => T.Task<any, any, any> ? ARGS : unknown[]
) => T[K] extends (...args: any[]) => T.Task<infer R, infer E, infer A>
  ? T.Task<R & Has<T>, E, A>
  : unknown[] {
  return (k) => (...args) => asksServiceM(s)((t) => (t[k] as any)(...args)) as any;
}

/**
 * Access a service with the required Service Entry
 */
export function asksService<T>(s: Tag<T>): <B>(f: (a: T) => B) => T.Task<Has<T>, never, B> {
  return (f) => asksServiceM(s)((a) => T.pure(f(a)));
}

/**
 * Access a service with the required Service Entry
 */
export function askService<T>(s: Tag<T>): T.Task<Has<T>, never, T> {
  return asksServiceM(s)((a) => T.pure(a));
}

/**
 * Provides the service with the required Service Entry, depends on global HasRegistry
 */
export function giveServiceM<T>(_: Tag<T>) {
  return <R, E>(f: T.Task<R, E, T>) => <R1, E1, A1>(
    ma: T.Task<R1 & Has<T>, E1, A1>
  ): T.Task<R & R1, E | E1, A1> =>
    T.asksM((r: R & R1) => T.chain_(f, (t) => T.giveAll_(ma, mergeEnvironments(_, r, t))));
}

/**
 * Provides the service with the required Service Entry, depends on global HasRegistry
 */
export function giveService<T>(
  _: Tag<T>
): (f: T) => <R1, E1, A1>(ma: T.Task<R1 & Has<T>, E1, A1>) => T.Task<R1, E1, A1> {
  return (f) => (ma) => giveServiceM(_)(T.pure(f))(ma);
}

/**
 * Replaces the service with the required Service Entry, depends on global HasRegistry
 */
export function replaceServiceM<R, E, T>(
  _: Tag<T>,
  f: (_: T) => T.Task<R, E, T>
): <R1, E1, A1>(ma: T.Task<R1 & Has<T>, E1, A1>) => T.Task<R & R1 & Has<T>, E1 | E, A1> {
  return (ma) => asksServiceM(_)((t) => giveServiceM(_)(f(t))(ma));
}

/**
 * Replaces the service with the required Service Entry, depends on global HasRegistry
 */
export function replaceServiceM_<R, E, T, R1, E1, A1>(
  ma: T.Task<R1 & Has<T>, E1, A1>,
  _: Tag<T>,
  f: (_: T) => T.Task<R, E, T>
): T.Task<R & R1 & Has<T>, E | E1, A1> {
  return asksServiceM(_)((t) => giveServiceM(_)(f(t))(ma));
}

/**
 * Replaces the service with the required Service Entry, depends on global HasRegistry
 */
export function replaceService<T>(
  _: Tag<T>,
  f: (_: T) => T
): <R1, E1, A1>(ma: T.Task<R1 & Has<T>, E1, A1>) => T.Task<R1 & Has<T>, E1, A1> {
  return (ma) => asksServiceM(_)((t) => giveServiceM(_)(T.pure(f(t)))(ma));
}

/**
 * Replaces the service with the required Service Entry, depends on global HasRegistry
 */
export function replaceService_<R1, E1, A1, T>(
  ma: T.Task<R1 & Has<T>, E1, A1>,
  _: Tag<T>,
  f: (_: T) => T
): T.Task<R1 & Has<T>, E1, A1> {
  return asksServiceM(_)((t) => giveServiceM(_)(T.pure(f(t)))(ma));
}

export function region<K, T>(): Tag<Region<T, K>> {
  return tag<Region<T, K>>();
}

export function useRegion<K, T>(
  h: Tag<Region<T, K>>
): <R, E, A>(e: T.Task<R & T, E, A>) => T.Task<R & Has<Region<T, K>>, E, A> {
  return (e) => asksServiceM(h)((a) => pipe(e, T.give((a as any) as T)));
}

export function asksRegionM<K, T>(
  h: Tag<Region<T, K>>
): <R, E, A>(e: (_: T) => T.Task<R & T, E, A>) => T.Task<R & Has<Region<T, K>>, E, A> {
  return (e) => asksServiceM(h)((a) => pipe(T.asksM(e), T.give((a as any) as T)));
}

export function asksRegion<K, T>(
  h: Tag<Region<T, K>>
): <A>(e: (_: T) => A) => T.Task<Has<Region<T, K>>, never, A> {
  return (e) => asksServiceM(h)((a) => pipe(T.asks(e), T.give((a as any) as T)));
}

export function askRegion<K, T>(h: Tag<Region<T, K>>): T.Task<Has<Region<T, K>>, never, T> {
  return asksServiceM(h)((a) =>
    pipe(
      T.asks((r: T) => r),
      T.give((a as any) as T)
    )
  );
}

export function askServiceIn<A>(
  _: Tag<A>
): <K, T>(h: Tag<Region<Has<A> & T, K>>) => T.Task<Has<Region<Has<A> & T, K>>, never, A> {
  return (h) =>
    useRegion(h)(
      asksServiceM(_)((a) =>
        pipe(
          T.asks((r: A) => r),
          T.give((a as any) as A)
        )
      )
    );
}

export function asksServiceIn<A>(
  _: Tag<A>
): <K, T>(
  h: Tag<Region<Has<A> & T, K>>
) => <B>(f: (_: A) => B) => T.Task<Has<Region<Has<A> & T, K>>, never, B> {
  return (h) => (f) =>
    useRegion(h)(
      asksServiceM(_)((a) =>
        pipe(
          T.asks((r: A) => f(r)),
          T.give((a as any) as A)
        )
      )
    );
}

export function asksServiceInM<A>(
  _: Tag<A>
): <K, T>(
  h: Tag<Region<Has<A> & T, K>>
) => <R, E, B>(f: (_: A) => T.Task<R, E, B>) => T.Task<R & Has<Region<Has<A> & T, K>>, E, B> {
  return (h) => (f) =>
    useRegion(h)(
      asksServiceM(_)((a) =>
        pipe(
          T.asksM((r: A) => f(r)),
          T.give((a as any) as A)
        )
      )
    );
}

/**
 * ```haskell
 * asService :: Tag a -> Task r e a -> Task r e (Has a)
 * ```
 *
 * Maps the success value of this effect to a service.
 */
export function asService<A>(has: Tag<A>): <R, E>(fa: T.Task<R, E, A>) => T.Task<R, E, Has<A>> {
  return (fa) => T.map_(fa, has.of);
}
