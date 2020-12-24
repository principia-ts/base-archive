import type { Context } from "../Context";
import type { FIO, IO } from "@principia/io/IO";

import * as FL from "@principia/free/FreeList";

export class Empty<R, E> {
  readonly R!: (_: R) => void;
  readonly E!: () => E;

  readonly _tag = "Empty";
}

export type RouteFn<R, E> = (ctx: Context<{}>, next: FIO<E, void>) => IO<R, E, void>;

export type MiddlewareFn<R, E> = (cont: RouteFn<R, E>) => RouteFn<R, E>;

export class Middleware<R, E> {
  constructor(readonly apply: MiddlewareFn<R, E>) {}
}

export class Route<R, E> {
  readonly _tag = "Route";
  readonly E!: () => E;
  constructor(
    readonly route: RouteFn<R, any>,
    readonly middlewares = FL.empty<Middleware<any, any>>()
  ) {}
  middleware<R1 extends R = R, E1 extends E = E>(): ReadonlyArray<Middleware<R1, E1>> {
    return FL.toArray(this.middlewares);
  }
}

export class Combine<R, E> {
  readonly _tag = "Combine";
  constructor(readonly left: Routes<R, E>, readonly right: Routes<R, E>) {}
}

export type Routes<R, E> = Route<R, E> | Combine<R, E> | Empty<R, E>;

export const empty: Routes<unknown, never> = new Empty();
