import type { Has, Region, Tag } from "@principia/base/data/Has";
import type { UnionToIntersection } from "@principia/prelude/Utils";

import * as A from "@principia/base/data/Array";
import { pipe } from "@principia/base/data/Function";
import { mergeEnvironments, tag } from "@principia/base/data/Has";
import * as R from "@principia/base/data/Record";

import * as I from "../core";

/**
 * Access a record of services with the required Service Entries
 */
export function asksServicesM<SS extends Record<string, Tag<any>>>(
  s: SS
): <R = unknown, E = never, B = unknown>(
  f: (a: { [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? T : unknown }) => I.IO<R, E, B>
) => I.IO<
  R &
    UnionToIntersection<
      { [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? Has<T> : unknown }[keyof SS]
    >,
  E,
  B
> {
  return (f) =>
    I.asksM(
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
  f: (...a: { [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? T : unknown }) => I.IO<R, E, B>
) => I.IO<
  R &
    UnionToIntersection<
      { [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? Has<T> : never }[keyof SS & number]
    >,
  E,
  B
> {
  return (f) =>
    I.asksM(
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
) => I.URIO<
  UnionToIntersection<
    { [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? Has<T> : never }[keyof SS & number]
  >,
  B
> {
  return (f) =>
    I.asks(
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
) => I.URIO<
  UnionToIntersection<
    { [k in keyof SS]: [SS[k]] extends [Tag<infer T>] ? Has<T> : unknown }[keyof SS]
  >,
  B
> {
  return (f) =>
    I.asks(
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
): <R, E, B>(f: (a: T) => I.IO<R, E, B>) => I.IO<R & Has<T>, E, B> {
  return (f) => I.asksM((r: Has<T>) => f(r[s.key as any]));
}

/**
 * Access a service with the required Service Entry
 */
export function asksServiceF<T>(
  s: Tag<T>
): <
  K extends keyof T &
    { [k in keyof T]: T[k] extends (...args: any[]) => I.IO<any, any, any> ? k : never }[keyof T]
>(
  k: K
) => (
  ...args: T[K] extends (...args: infer ARGS) => I.IO<any, any, any> ? ARGS : unknown[]
) => T[K] extends (...args: any[]) => I.IO<infer R, infer E, infer A>
  ? I.IO<R & Has<T>, E, A>
  : unknown[] {
  return (k) => (...args) => asksServiceM(s)((t) => (t[k] as any)(...args)) as any;
}

/**
 * Access a service with the required Service Entry
 */
export function asksService<T>(s: Tag<T>): <B>(f: (a: T) => B) => I.IO<Has<T>, never, B> {
  return (f) => asksServiceM(s)((a) => I.pure(f(a)));
}

/**
 * Access a service with the required Service Entry
 */
export function askService<T>(s: Tag<T>): I.IO<Has<T>, never, T> {
  return asksServiceM(s)((a) => I.pure(a));
}

/**
 * Provides the service with the required Service Entry, depends on global HasRegistry
 */
export function giveServiceM<T>(_: Tag<T>) {
  return <R, E>(f: I.IO<R, E, T>) => <R1, E1, A1>(
    ma: I.IO<R1 & Has<T>, E1, A1>
  ): I.IO<R & R1, E | E1, A1> =>
    I.asksM((r: R & R1) => I.flatMap_(f, (t) => I.giveAll_(ma, mergeEnvironments(_, r, t))));
}

/**
 * Provides the service with the required Service Entry, depends on global HasRegistry
 */
export function giveService<T>(
  _: Tag<T>
): (f: T) => <R1, E1, A1>(ma: I.IO<R1 & Has<T>, E1, A1>) => I.IO<R1, E1, A1> {
  return (f) => (ma) => giveServiceM(_)(I.pure(f))(ma);
}

/**
 * Replaces the service with the required Service Entry, depends on global HasRegistry
 */
export function replaceServiceM<R, E, T>(
  _: Tag<T>,
  f: (_: T) => I.IO<R, E, T>
): <R1, E1, A1>(ma: I.IO<R1 & Has<T>, E1, A1>) => I.IO<R & R1 & Has<T>, E1 | E, A1> {
  return (ma) => asksServiceM(_)((t) => giveServiceM(_)(f(t))(ma));
}

/**
 * Replaces the service with the required Service Entry, depends on global HasRegistry
 */
export function replaceServiceM_<R, E, T, R1, E1, A1>(
  ma: I.IO<R1 & Has<T>, E1, A1>,
  _: Tag<T>,
  f: (_: T) => I.IO<R, E, T>
): I.IO<R & R1 & Has<T>, E | E1, A1> {
  return asksServiceM(_)((t) => giveServiceM(_)(f(t))(ma));
}

/**
 * Replaces the service with the required Service Entry, depends on global HasRegistry
 */
export function replaceService<T>(
  _: Tag<T>,
  f: (_: T) => T
): <R1, E1, A1>(ma: I.IO<R1 & Has<T>, E1, A1>) => I.IO<R1 & Has<T>, E1, A1> {
  return (ma) => asksServiceM(_)((t) => giveServiceM(_)(I.pure(f(t)))(ma));
}

/**
 * Replaces the service with the required Service Entry, depends on global HasRegistry
 */
export function replaceService_<R1, E1, A1, T>(
  ma: I.IO<R1 & Has<T>, E1, A1>,
  _: Tag<T>,
  f: (_: T) => T
): I.IO<R1 & Has<T>, E1, A1> {
  return asksServiceM(_)((t) => giveServiceM(_)(I.pure(f(t)))(ma));
}

export function region<K, T>(): Tag<Region<T, K>> {
  return tag<Region<T, K>>();
}

export function useRegion<K, T>(
  h: Tag<Region<T, K>>
): <R, E, A>(e: I.IO<R & T, E, A>) => I.IO<R & Has<Region<T, K>>, E, A> {
  return (e) => asksServiceM(h)((a) => pipe(e, I.give((a as any) as T)));
}

export function asksRegionM<K, T>(
  h: Tag<Region<T, K>>
): <R, E, A>(e: (_: T) => I.IO<R & T, E, A>) => I.IO<R & Has<Region<T, K>>, E, A> {
  return (e) => asksServiceM(h)((a) => pipe(I.asksM(e), I.give((a as any) as T)));
}

export function asksRegion<K, T>(
  h: Tag<Region<T, K>>
): <A>(e: (_: T) => A) => I.IO<Has<Region<T, K>>, never, A> {
  return (e) => asksServiceM(h)((a) => pipe(I.asks(e), I.give((a as any) as T)));
}

export function askRegion<K, T>(h: Tag<Region<T, K>>): I.IO<Has<Region<T, K>>, never, T> {
  return asksServiceM(h)((a) =>
    pipe(
      I.asks((r: T) => r),
      I.give((a as any) as T)
    )
  );
}

export function askServiceIn<A>(
  _: Tag<A>
): <K, T>(h: Tag<Region<Has<A> & T, K>>) => I.IO<Has<Region<Has<A> & T, K>>, never, A> {
  return (h) =>
    useRegion(h)(
      asksServiceM(_)((a) =>
        pipe(
          I.asks((r: A) => r),
          I.give((a as any) as A)
        )
      )
    );
}

export function asksServiceIn<A>(
  _: Tag<A>
): <K, T>(
  h: Tag<Region<Has<A> & T, K>>
) => <B>(f: (_: A) => B) => I.IO<Has<Region<Has<A> & T, K>>, never, B> {
  return (h) => (f) =>
    useRegion(h)(
      asksServiceM(_)((a) =>
        pipe(
          I.asks((r: A) => f(r)),
          I.give((a as any) as A)
        )
      )
    );
}

export function asksServiceInM<A>(
  _: Tag<A>
): <K, T>(
  h: Tag<Region<Has<A> & T, K>>
) => <R, E, B>(f: (_: A) => I.IO<R, E, B>) => I.IO<R & Has<Region<Has<A> & T, K>>, E, B> {
  return (h) => (f) =>
    useRegion(h)(
      asksServiceM(_)((a) =>
        pipe(
          I.asksM((r: A) => f(r)),
          I.give((a as any) as A)
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
export function asService<A>(has: Tag<A>): <R, E>(fa: I.IO<R, E, A>) => I.IO<R, E, Has<A>> {
  return (fa) => I.map_(fa, has.of);
}
