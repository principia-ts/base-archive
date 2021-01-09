import type { IO } from '../core'
import type { Has, Tag } from '@principia/base/Has'

import { asksService, asksServiceM } from '../core'

export type ShapeFn<T> = Pick<
  T,
  {
    [k in keyof T]: T[k] extends (...args: infer ARGS) => IO<infer R, infer E, infer A>
      ? ((...args: ARGS) => IO<R, E, A>) extends T[k]
        ? k
        : never
      : never
  }[keyof T]
>

export type ShapeCn<T> = Pick<
  T,
  {
    [k in keyof T]: T[k] extends IO<any, any, any> ? k : never
  }[keyof T]
>

export type ShapePu<T> = Omit<
  T,
  | {
      [k in keyof T]: T[k] extends (...args: any[]) => any ? k : never
    }[keyof T]
  | {
      [k in keyof T]: T[k] extends IO<any, any, any> ? k : never
    }[keyof T]
>

export type DerivedLifted<
  T,
  Fns extends keyof ShapeFn<T>,
  Cns extends keyof ShapeCn<T>,
  Values extends keyof ShapePu<T>
> = {
  [k in Fns]: T[k] extends (...args: infer ARGS) => IO<infer R, infer E, infer A>
    ? (...args: ARGS) => IO<R & Has<T>, E, A>
    : never
} &
  {
    [k in Cns]: T[k] extends IO<infer R, infer E, infer A> ? IO<R & Has<T>, E, A> : never
  } &
  {
    [k in Values]: IO<Has<T>, never, T[k]>
  }

export function deriveLifted<T>(
  H: Tag<T>
): <
  Fns extends keyof ShapeFn<T> = never,
  Cns extends keyof ShapeCn<T> = never,
  Values extends keyof ShapePu<T> = never
>(
  functions: Fns[],
  constants: Cns[],
  values: Values[]
) => DerivedLifted<T, Fns, Cns, Values> {
  return (functions, constants, values) => {
    const mut_ret = {} as any

    for (const k of functions) {
      mut_ret[k] = (...args: any[]) => asksServiceM(H)((h) => h[k](...args))
    }

    for (const k of constants) {
      mut_ret[k] = asksServiceM(H)((h) => h[k])
    }

    for (const k of values) {
      mut_ret[k] = asksService(H)((h) => h[k])
    }

    return mut_ret as any
  }
}

export type DerivedAccessM<T, Gens extends keyof T> = {
  [k in Gens]: <R_, E_, A_>(f: (_: T[k]) => IO<R_, E_, A_>) => IO<R_ & Has<T>, E_, A_>
}

export function deriveAsksM<T>(H: Tag<T>): <Gens extends keyof T = never>(generics: Gens[]) => DerivedAccessM<T, Gens> {
  return (generics) => {
    const mut_ret = {} as any

    for (const k of generics) {
      mut_ret[k] = (f: any) => asksServiceM(H)((h) => f(h[k]))
    }

    return mut_ret as any
  }
}

export type DerivedAccess<T, Gens extends keyof T> = {
  [k in Gens]: <A_>(f: (_: T[k]) => A_) => IO<Has<T>, never, A_>
}

export function deriveAsks<T>(H: Tag<T>): <Gens extends keyof T = never>(generics: Gens[]) => DerivedAccess<T, Gens> {
  return (generics) => {
    const mut_ret = {} as any

    for (const k of generics) {
      mut_ret[k] = (f: any) => asksService(H)((h) => f(h[k]))
    }

    return mut_ret as any
  }
}
