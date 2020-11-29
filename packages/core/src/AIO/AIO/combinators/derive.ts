import type { Has, Tag } from "../../../Has";
import type { AIO } from "../model";
import { asksService, asksServiceM } from "./service";

export type ShapeFn<T> = Pick<
  T,
  {
    [k in keyof T]: T[k] extends (...args: infer ARGS) => AIO<infer R, infer E, infer A>
      ? ((...args: ARGS) => AIO<R, E, A>) extends T[k]
        ? k
        : never
      : never;
  }[keyof T]
>;

export type ShapeCn<T> = Pick<
  T,
  {
    [k in keyof T]: T[k] extends AIO<any, any, any> ? k : never;
  }[keyof T]
>;

export type ShapePu<T> = Omit<
  T,
  | {
      [k in keyof T]: T[k] extends (...args: any[]) => any ? k : never;
    }[keyof T]
  | {
      [k in keyof T]: T[k] extends AIO<any, any, any> ? k : never;
    }[keyof T]
>;

export type DerivedLifted<
  T,
  Fns extends keyof ShapeFn<T>,
  Cns extends keyof ShapeCn<T>,
  Values extends keyof ShapePu<T>
> = {
  [k in Fns]: T[k] extends (...args: infer ARGS) => AIO<infer R, infer E, infer A>
    ? (...args: ARGS) => AIO<R & Has<T>, E, A>
    : never;
} &
  {
    [k in Cns]: T[k] extends AIO<infer R, infer E, infer A> ? AIO<R & Has<T>, E, A> : never;
  } &
  {
    [k in Values]: AIO<Has<T>, never, T[k]>;
  };

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
    const ret = {} as any;

    for (const k of functions) {
      ret[k] = (...args: any[]) => asksServiceM(H)((h) => h[k](...args));
    }

    for (const k of constants) {
      ret[k] = asksServiceM(H)((h) => h[k]);
    }

    for (const k of values) {
      ret[k] = asksService(H)((h) => h[k]);
    }

    return ret as any;
  };
}

export type DerivedAccessM<T, Gens extends keyof T> = {
  [k in Gens]: <R_, E_, A_>(f: (_: T[k]) => AIO<R_, E_, A_>) => AIO<R_ & Has<T>, E_, A_>;
};

export function deriveAsksM<T>(
  H: Tag<T>
): <Gens extends keyof T = never>(generics: Gens[]) => DerivedAccessM<T, Gens> {
  return (generics) => {
    const ret = {} as any;

    for (const k of generics) {
      ret[k] = (f: any) => asksServiceM(H)((h) => f(h[k]));
    }

    return ret as any;
  };
}

export type DerivedAccess<T, Gens extends keyof T> = {
  [k in Gens]: <A_>(f: (_: T[k]) => A_) => AIO<Has<T>, never, A_>;
};

export function deriveAsks<T>(
  H: Tag<T>
): <Gens extends keyof T = never>(generics: Gens[]) => DerivedAccess<T, Gens> {
  return (generics) => {
    const ret = {} as any;

    for (const k of generics) {
      ret[k] = (f: any) => asksService(H)((h) => f(h[k]));
    }

    return ret as any;
  };
}
