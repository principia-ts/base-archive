import type { Routes } from "./model";
import type { Predicate } from "@principia/base/data/Function";
import type { Has, Tag } from "@principia/base/data/Has";
import type { IO, URIO } from "@principia/io/IO";

import * as I from "@principia/io/IO";

import { Context } from "../Context";
import { Combine, Route } from "./model";

export function route_<R, E, R1, E1>(
  routes: Routes<R, E>,
  f: (req: Context, next: IO<R, E, void>) => IO<R1, E1, void>
): Routes<R1, E1> {
  return new Combine(routes, new Route(f as any) as any) as any;
}

export function route<R, E, R1, E1>(
  f: (req: Context, next: IO<R, E, void>) => IO<R1, E1, void>
): (routes: Routes<R, E>) => Routes<R1, E1> {
  return (routes) => route_(routes, f);
}

export function addRoute_<R, E, R1, E1>(
  routes: Routes<R, E>,
  path: Predicate<Context>,
  f: (ctx: Context) => IO<R1 & Has<Context>, E1, void>
): Routes<R & R1, E | E1> {
  return route_(
    routes,
    (ctx, n): IO<R & R1, E | E1, void> =>
      ctx.req.url ? (path(ctx) ? I.giveService(Context)(ctx)(f(ctx)) : n) : n
  );
}

export function addRoute<R1, E1>(
  tag: Tag<Context>,
  path: Predicate<Context>,
  f: (ctx: Context) => IO<R1 & Has<Context>, E1, void>
): <R, E>(routes: Routes<R, E>) => Routes<R & R1, E | E1> {
  return (routes) => addRoute_(routes, path, f);
}

export function addRouteM_<R, E, R1, R2, E2>(
  routes: Routes<R, E>,
  path: (ctx: Context) => URIO<R1, boolean>,
  f: (ctx: Context) => IO<R2 & Has<Context>, E2, void>
): Routes<R & R1 & R2, E | E2> {
  return route_(routes, (ctx, next) =>
    I.flatMap_(
      path(ctx),
      (b): IO<R & R1 & R2, E | E2, void> => (b ? I.giveService(Context)(ctx)(f(ctx)) : next)
    )
  );
}

export function addRouteM<R1, R2, E2>(
  tag: Tag<Context>,
  path: (ctx: Context) => URIO<R1, boolean>,
  f: (ctx: Context) => IO<R2 & Has<Context>, E2, void>
): <R, E>(routes: Routes<R, E>) => Routes<R & R1 & R2, E | E2> {
  return (routes) => addRouteM_(routes, path, f);
}
