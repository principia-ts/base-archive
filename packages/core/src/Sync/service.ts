import type { UnionToIntersection } from "@principia/prelude/Utils";

import * as A from "../Array/_core";
import { pipe } from "../Function";
import type { Has, Region, Tag } from "../Has";
import { mergeEnvironments, tag } from "../Has";
import * as R from "../Record";
import * as X from "../SIO";
import type { Sync } from "./model";

/**
 * Access a record of services with the required Service Entries
 */
export function asksServicesM<SS extends Record<string, Tag<any>>>(
  s: SS
): <R = unknown, E = never, B = unknown>(
  f: (a: { [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? T : unknown }) => Sync<R, E, B>
) => Sync<
  R &
    UnionToIntersection<
      { [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? Has<T> : unknown }[keyof SS]
    >,
  E,
  B
> {
  return (f) =>
    X.asksM(
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
  f: (...a: { [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? T : unknown }) => Sync<R, E, B>
) => Sync<
  R &
    UnionToIntersection<
      { [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? Has<T> : never }[keyof SS & number]
    >,
  E,
  B
> {
  return (f) =>
    X.asksM(
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
) => Sync<
  UnionToIntersection<
    { [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? Has<T> : never }[keyof SS & number]
  >,
  never,
  B
> {
  return (f) =>
    X.asks(
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
) => Sync<
  UnionToIntersection<
    { [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? Has<T> : unknown }[keyof SS]
  >,
  never,
  B
> {
  return (f) =>
    X.asks(
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
): <R, E, B>(f: (a: T) => Sync<R, E, B>) => Sync<R & Has<T>, E, B> {
  return (f) => X.asksM((r: Has<T>) => f(r[s.key as any]));
}

/**
 * Access a service with the required Service Entry
 */
export function asksServiceF<T>(
  s: Tag<T>
): <
  K extends keyof T &
    { [k in keyof T]: T[k] extends (...args: any[]) => Sync<any, any, any> ? k : never }[keyof T]
>(
  k: K
) => (
  ...args: T[K] extends (...args: infer ARGS) => Sync<any, any, any> ? ARGS : unknown[]
) => T[K] extends (...args: any[]) => Sync<infer R, infer E, infer A>
  ? Sync<R & Has<T>, E, A>
  : unknown[] {
  return (k) => (...args) => asksServiceM(s)((t) => (t[k] as any)(...args)) as any;
}

/**
 * Access a service with the required Service Entry
 */
export function asksService<T>(s: Tag<T>): <B>(f: (a: T) => B) => Sync<Has<T>, never, B> {
  return (f) => asksServiceM(s)((a) => X.pure(f(a)));
}

/**
 * Access a service with the required Service Entry
 */
export function askService<T>(s: Tag<T>): Sync<Has<T>, never, T> {
  return asksServiceM(s)((a) => X.pure(a));
}

/**
 * Provides the service with the required Service Entry, depends on global HasRegistry
 */
export function giveServiceM<T>(
  _: Tag<T>
): <R, E>(
  f: Sync<R, E, T>
) => <R1, E1, A1>(ma: Sync<R1 & Has<T>, E1, A1>) => Sync<R & R1, E | E1, A1> {
  return <R, E>(f: Sync<R, E, T>) => <R1, E1, A1>(
    ma: Sync<R1 & Has<T>, E1, A1>
  ): Sync<R & R1, E | E1, A1> =>
    X.asksM((r: R & R1) => X.chain_(f, (t) => X.giveAll_(ma, mergeEnvironments(_, r, t))));
}

/**
 * Provides the service with the required Service Entry, depends on global HasRegistry
 */
export function giveService<T>(
  _: Tag<T>
): (f: T) => <R1, E1, A1>(ma: Sync<R1 & Has<T>, E1, A1>) => Sync<R1, E1, A1> {
  return (f) => (ma) => giveServiceM(_)(X.pure(f))(ma);
}

/**
 * Replaces the service with the required Service Entry, depends on global HasRegistry
 */
export function replaceServiceM<R, E, T>(
  _: Tag<T>,
  f: (_: T) => Sync<R, E, T>
): <R1, E1, A1>(ma: Sync<R1 & Has<T>, E1, A1>) => Sync<R & R1 & Has<T>, E | E1, A1> {
  return (ma) => asksServiceM(_)((t) => giveServiceM(_)(f(t))(ma));
}

/**
 * Replaces the service with the required Service Entry, depends on global HasRegistry
 */
export function replaceServiceM_<R, E, T, R1, E1, A1>(
  ma: Sync<R1 & Has<T>, E1, A1>,
  _: Tag<T>,
  f: (_: T) => Sync<R, E, T>
): Sync<R & R1 & Has<T>, E | E1, A1> {
  return asksServiceM(_)((t) => giveServiceM(_)(f(t))(ma));
}

/**
 * Replaces the service with the required Service Entry, depends on global HasRegistry
 */
export function replaceService<T>(
  _: Tag<T>,
  f: (_: T) => T
): <R1, E1, A1>(ma: Sync<R1 & Has<T>, E1, A1>) => Sync<R1 & Has<T>, E1, A1> {
  return (ma) => asksServiceM(_)((t) => giveServiceM(_)(X.pure(f(t)))(ma));
}

/**
 * Replaces the service with the required Service Entry, depends on global HasRegistry
 */
export function replaceService_<R1, E1, A1, T>(
  ma: Sync<R1 & Has<T>, E1, A1>,
  _: Tag<T>,
  f: (_: T) => T
): Sync<R1 & Has<T>, E1, A1> {
  return asksServiceM(_)((t) => giveServiceM(_)(X.pure(f(t)))(ma));
}

export function region<K, T>(): Tag<Region<T, K>> {
  return tag<Region<T, K>>();
}

export function useRegion<K, T>(
  h: Tag<Region<T, K>>
): <R, E, A>(e: Sync<R & T, E, A>) => Sync<R & Has<Region<T, K>>, E, A> {
  return (e) => asksServiceM(h)((a) => pipe(e, X.give((a as any) as T)));
}

export function asksRegionM<K, T>(
  h: Tag<Region<T, K>>
): <R, E, A>(e: (_: T) => Sync<R & T, E, A>) => Sync<R & Has<Region<T, K>>, E, A> {
  return (e) => asksServiceM(h)((a) => pipe(X.asksM(e), X.give((a as any) as T)));
}

export function asksRegion<K, T>(
  h: Tag<Region<T, K>>
): <A>(e: (_: T) => A) => Sync<Has<Region<T, K>>, never, A> {
  return (e) => asksServiceM(h)((a) => pipe(X.asks(e), X.give((a as any) as T)));
}

export function askRegion<K, T>(h: Tag<Region<T, K>>): Sync<Has<Region<T, K>>, never, T> {
  return asksServiceM(h)((a) =>
    pipe(
      X.asks((r: T) => r),
      X.give((a as any) as T)
    )
  );
}

export function askServiceIn<A>(
  _: Tag<A>
): <K, T>(h: Tag<Region<Has<A> & T, K>>) => Sync<Has<Region<Has<A> & T, K>>, never, A> {
  return (h) =>
    useRegion(h)(
      asksServiceM(_)((a) =>
        pipe(
          X.asks((r: A) => r),
          X.give((a as any) as A)
        )
      )
    );
}

export function asksServiceIn<A>(
  _: Tag<A>
): <K, T>(
  h: Tag<Region<Has<A> & T, K>>
) => <B>(f: (_: A) => B) => Sync<Has<Region<Has<A> & T, K>>, never, B> {
  return (h) => (f) =>
    useRegion(h)(
      asksServiceM(_)((a) =>
        pipe(
          X.asks((r: A) => f(r)),
          X.give((a as any) as A)
        )
      )
    );
}

export function asksServiceInM<A>(
  _: Tag<A>
): <K, T>(
  h: Tag<Region<Has<A> & T, K>>
) => <R, E, B>(f: (_: A) => Sync<R, E, B>) => Sync<R & Has<Region<Has<A> & T, K>>, E, B> {
  return (h) => (f) =>
    useRegion(h)(
      asksServiceM(_)((a) =>
        pipe(
          X.asksM((r: A) => f(r)),
          X.give((a as any) as A)
        )
      )
    );
}

/**
 * ```haskell
 * asService :: Tag a -> AIO r e a -> AIO r e (Has a)
 * ```
 *
 * Maps the success value of this effect to a service.
 */
export function asService<A>(has: Tag<A>): <R, E>(fa: Sync<R, E, A>) => Sync<R, E, Has<A>> {
  return (fa) => X.map_(fa, has.of);
}
