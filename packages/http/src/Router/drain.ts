import * as A from "@principia/core/Array";
import * as Sy from "@principia/core/Sync";
import * as T from "@principia/core/Task";
import * as FR from "@principia/core/Task/FiberRef";
import { flow, identity, pipe } from "@principia/prelude";

import type { Context } from "../Context";
import { RequestQueue } from "../HttpServer";
import type { RouteFn, Routes } from "./model";

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
