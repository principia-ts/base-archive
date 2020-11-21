import * as FM from "@principia/core/FreeMonoid";
import type * as T from "@principia/core/Task";

import type { Context } from "../Context";

export class Empty<R, E> {
  readonly R!: (_: R) => void;
  readonly E!: () => E;

  readonly _tag = "Empty";
}

export type RouteFn<R, E> = (ctx: Context, next: T.EIO<E, void>) => T.Task<R, E, void>;

export type MiddlewareFn<R, E> = (cont: RouteFn<R, E>) => RouteFn<R, E>;

export class Middleware<R, E> {
  constructor(readonly middleware: MiddlewareFn<R, E>) {}
}

export class Route<R, E> {
  readonly _tag = "Route";
  readonly E!: () => E;
  constructor(
    readonly route: RouteFn<R, any>,
    readonly middlewares = FM.empty<Middleware<any, any>>()
  ) {}
  middleware<R1 extends R = R, E1 extends E = E>(): ReadonlyArray<Middleware<R1, E1>> {
    return FM.toArray(this.middlewares);
  }
}

export class Combine<R, E> {
  readonly _tag = "Combine";
  constructor(readonly left: Routes<R, E>, readonly right: Routes<R, E>) {}
}

export type Routes<R, E> = Route<R, E> | Combine<R, E> | Empty<R, E>;

export const empty: Routes<unknown, never> = new Empty();

export type Method = "GET" | "POST" | "PATCH" | "PUT" | "DELETE" | "OPTIONS";
