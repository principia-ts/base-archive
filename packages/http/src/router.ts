import * as A from "@principia/core/Array";
import * as FM from "@principia/core/FreeMonoid";
import type { Has } from "@principia/core/Has";
import * as Sy from "@principia/core/Sync";
import * as T from "@principia/core/Task";
import * as FR from "@principia/core/Task/FiberRef";
import type { Predicate } from "@principia/prelude";
import { flow, identity, pipe } from "@principia/prelude";
import { Infer } from "@principia/prelude/HKT";
import type { UnionToIntersection } from "@principia/prelude/Utils";
import { Erase } from "@principia/prelude/Utils";
import { RSA_X931_PADDING } from "constants";

import { Context } from "./Context";
import { RequestQueue } from "./HttpServer";

export class Empty<R, E> {
  readonly R!: (_: R) => void;
  readonly E!: () => E;

  readonly _tag = "Empty";
}

export type RouteFn<R, E> = (_: Context, next: T.EIO<E, void>) => T.Task<R, E, void>;

export type MiddlewareFn<R, E> = (route: RouteFn<R, E>) => RouteFn<R, E>;

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

export function route_<R, E, R1, E1>(
  routes: Routes<R, E>,
  f: (req: Context, next: T.Task<R, E, void>) => T.Task<R1, E1, void>
): Routes<R1, E1> {
  return new Combine(routes, new Route(f as any) as any) as any;
}

export function route<R, E, R1, E1>(
  f: (req: Context, next: T.Task<R, E, void>) => T.Task<R1, E1, void>
): (routes: Routes<R, E>) => Routes<R1, E1> {
  return (routes) => route_(routes, f);
}

export function addRoute_<R, E, R1, E1>(
  routes: Routes<R, E>,
  path: Predicate<Context>,
  f: (ctx: Context) => T.Task<R1 & Has<Context>, E1, void>
): Routes<R & R1, E | E1> {
  return route_(
    routes,
    (ctx, n): T.Task<R & R1, E | E1, void> =>
      ctx.req.url ? (path(ctx) ? T.giveService(Context)(ctx)(f(ctx)) : n) : n
  );
}

export function addRoute<R1, E1>(
  path: Predicate<Context>,
  f: (ctx: Context) => T.Task<R1 & Has<Context>, E1, void>
): <R, E>(routes: Routes<R, E>) => Routes<R & R1, E | E1> {
  return (routes) => addRoute_(routes, path, f);
}

export function addRouteM_<R, E, R1, R2, E2>(
  routes: Routes<R, E>,
  path: (ctx: Context) => T.RIO<R1, boolean>,
  f: (ctx: Context) => T.Task<R2 & Has<Context>, E2, void>
): Routes<R & R1 & R2, E | E2> {
  return route_(routes, (ctx, next) =>
    T.chain_(
      path(ctx),
      (b): T.Task<R & R1 & R2, E | E2, void> => (b ? T.giveService(Context)(ctx)(f(ctx)) : next)
    )
  );
}

export function addRouteM<R1, R2, E2>(
  path: (ctx: Context) => T.RIO<R1, boolean>,
  f: (ctx: Context) => T.Task<R2 & Has<Context>, E2, void>
): <R, E>(routes: Routes<R, E>) => Routes<R & R1 & R2, E | E2> {
  return (routes) => addRouteM_(routes, path, f);
}

export function addMiddlewareSafe<R, E, R1, E1>(
  routes: Routes<R, E>,
  middle: (cont: RouteFn<R, E>) => (ctx: Context, next: T.EIO<E, void>) => T.Task<R1, E1, void>
): Sy.IO<Routes<R1, E1>> {
  return Sy.gen(function* (_) {
    switch (routes._tag) {
      case "Empty": {
        return routes as any;
      }
      case "Route": {
        return new Route(
          routes.route,
          FM.append_(routes.middlewares, new Middleware(middle as any))
        ) as any;
      }
      case "Combine": {
        return new Combine(
          yield* _(addMiddlewareSafe(routes.left, middle)),
          yield* _(addMiddlewareSafe(routes.right, middle))
        );
      }
    }
  });
}

export function addMiddleware_<R, E, R1, E1>(
  routes: Routes<R, E>,
  middle: (cont: RouteFn<R, E>) => (ctx: Context, next: T.EIO<E, void>) => T.Task<R1, E1, void>
): Routes<R1, E1> {
  return Sy.runIO(addMiddlewareSafe(routes, middle));
}

export function addMiddleware<R, E, R1, E1>(
  middle: (cont: RouteFn<R, E>) => (ctx: Context, next: T.EIO<E, void>) => T.Task<R1, E1, void>
): (routes: Routes<R, E>) => Routes<R1, E1> {
  return (routes) => addMiddleware_(routes, middle);
}

function toArraySafe<R, E>(routes: Routes<R, E>): Sy.IO<ReadonlyArray<RouteFn<R, E>>> {
  return Sy.gen(function* (_) {
    switch (routes._tag) {
      case "Empty": {
        return [];
      }
      case "Route": {
        const middlewares = routes.middleware();
        if (A.isNonEmpty(middlewares)) {
          return [A.reduce_(middlewares, routes.route, (b, m) => (r, n) => m.middleware(b)(r, n))];
        }
        return [routes.route];
      }
      case "Combine": {
        return A.concat_(yield* _(toArraySafe(routes.left)), yield* _(toArraySafe(routes.right)));
      }
    }
  });
}

export const empty: Routes<unknown, never> = new Empty();

export const isRouterDraining = new FR.FiberRef(false, identity, (a, b) => a && b);

export type ProcessFn = (_: Context) => T.IO<void>;

export function drain<R>(rs: Routes<R, never>) {
  const routes = Sy.runIO(toArraySafe(rs));
  return T.gen(function* ($) {
    const env = yield* $(T.ask<R>());
    const pfn = yield* $(
      T.total(() =>
        A.reduce_(
          routes,
          <ProcessFn>((ctx) =>
            T.total(() => {
              ctx.res.statusCode = 404;
              ctx.res.end();
            })),
          (b, a) => (ctx) => T.giveAll_(a(ctx, b(ctx)), env)
        )
      )
    );
    const { queue } = yield* $(RequestQueue);
    return yield* $(
      pipe(
        isRouterDraining,
        FR.set(true),
        T.andThen(pipe(queue.take, T.chain(flow(pfn, T.fork)), T.forever))
      )
    );
  });
}

export type Method = "GET" | "POST" | "PATCH" | "PUT" | "DELETE" | "OPTIONS";

export function matchUrl(url: RegExp, methods: ReadonlyArray<Method> = []) {
  return (ctx: Context) =>
    ctx.req.url
      ? methods.length === 0
        ? url.test(ctx.req.url)
        : ctx.req.method
        ? url.test(ctx.req.url) && (<string[]>methods).includes(ctx.req.method.toUpperCase())
        : false
      : false;
}
