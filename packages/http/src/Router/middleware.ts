import * as FM from "@principia/core/FreeMonoid";
import type { FIO, IO } from "@principia/core/IO";
import type { USync } from "@principia/core/Sync";
import * as Sy from "@principia/core/Sync";

import type { Context } from "../Context";
import type { RouteFn, Routes } from "./model";
import { Combine, Middleware, Route } from "./model";

export function addMiddlewareSafe<R, E, R1, E1>(
  routes: Routes<R, E>,
  middle: (cont: RouteFn<R, E>) => (ctx: Context, next: FIO<E, void>) => IO<R1, E1, void>
): USync<Routes<R1, E1>> {
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
  middle: (cont: RouteFn<R, E>) => (ctx: Context, next: FIO<E, void>) => IO<R1, E1, void>
): Routes<R1, E1> {
  return Sy.runIO(addMiddlewareSafe(routes, middle));
}

export function addMiddleware<R, E, R1, E1>(
  middle: (cont: RouteFn<R, E>) => (ctx: Context, next: FIO<E, void>) => IO<R1, E1, void>
): (routes: Routes<R, E>) => Routes<R1, E1> {
  return (routes) => addMiddleware_(routes, middle);
}
