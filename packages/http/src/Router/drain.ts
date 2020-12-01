import * as A from "@principia/core/Array";
import type { UIO } from "@principia/core/IO";
import * as I from "@principia/core/IO";
import * as FR from "@principia/core/IO/FiberRef";
import type { USync } from "@principia/core/Sync";
import * as Sy from "@principia/core/Sync";
import { flow, identity, pipe } from "@principia/prelude";

import type { Context } from "../Context";
import { RequestQueue } from "../HttpServer";
import { Status } from "../utils";
import type { RouteFn, Routes } from "./model";

function toArraySafe<R, E>(routes: Routes<R, E>): USync<ReadonlyArray<RouteFn<R, E>>> {
  return Sy.gen(function* (_) {
    switch (routes._tag) {
      case "Empty": {
        return [];
      }
      case "Route": {
        const middlewares = routes.middleware();
        if (A.isNonEmpty(middlewares)) {
          return [A.reduce_(middlewares, routes.route, (b, m) => (r, n) => m.apply(b)(r, n))];
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

export type ProcessFn = (_: Context) => UIO<void>;

export function drain<R>(rs: Routes<R, never>) {
  const routes = Sy.runIO(toArraySafe(rs));
  return I.gen(function* ($) {
    const env = yield* $(I.ask<R>());
    const pfn = yield* $(
      I.total(() =>
        A.reduce_(
          routes,
          <ProcessFn>((ctx) => I.andThen_(ctx.res.status(Status.NotFound), ctx.res.end())),
          (b, a) => (ctx) => I.giveAll_(a(ctx, b(ctx)), env)
        )
      )
    );
    const { queue } = yield* $(RequestQueue);
    return yield* $(
      pipe(
        isRouterDraining,
        FR.set(true),
        I.andThen(pipe(queue.take, I.chain(flow(pfn, I.fork)), I.forever))
      )
    );
  });
}
