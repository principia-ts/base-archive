import type { Context } from '../Context'
import type { RouteFn, Routes } from './model'
import type { UIO } from '@principia/io/IO'
import type { USync } from '@principia/io/Sync'

import * as A from '@principia/base/data/Array'
import { flow, identity, pipe } from '@principia/base/data/Function'
import * as FR from '@principia/io/FiberRef'
import * as I from '@principia/io/IO'
import * as Sy from '@principia/io/Sync'

import { RequestQueue } from '../HttpServer'
import { Status } from '../utils'

function toArraySafe<R, E>(routes: Routes<R, E>): USync<ReadonlyArray<RouteFn<R, E>>> {
  return Sy.gen(function* (_) {
    switch (routes._tag) {
      case 'Empty': {
        return []
      }
      case 'Route': {
        const middlewares = routes.middleware()
        if (A.isNonEmpty(middlewares)) {
          return [A.foldLeft_(middlewares, routes.route, (b, m) => (r, n) => m.apply(b)(r, n))]
        }
        return [routes.route]
      }
      case 'Combine': {
        return A.concat_(yield* _(toArraySafe(routes.left)), yield* _(toArraySafe(routes.right)))
      }
    }
  })
}

export const isRouterDraining = new FR.FiberRef(false, identity, (a, b) => a && b)

export type ProcessFn = (_: Context) => UIO<void>

export function drain<R>(rs: Routes<R, never>) {
  const routes = Sy.unsafeRun(toArraySafe(rs))
  return I.gen(function* ($) {
    const env = yield* $(I.ask<R>())
    const pfn = yield* $(
      I.total(() =>
        A.foldLeft_(
          routes,
          <ProcessFn>((ctx) => I.andThen_(ctx.res.status(Status.NotFound), ctx.res.end())),
          (b, a) => (ctx) => I.giveAll_(a(ctx, b(ctx)), env)
        )
      )
    )
    const { queue } = yield* $(RequestQueue)
    return yield* $(
      pipe(isRouterDraining, FR.set(true), I.andThen(pipe(queue.take, I.flatMap(flow(pfn, I.fork)), I.forever)))
    )
  })
}
