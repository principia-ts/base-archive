import type { HttpRouteException } from '../exceptions/HttpRouteException'

import * as I from '@principia/io/IO'

import { isHttpRouteException } from '../exceptions/HttpRouteException'
import * as Http from '../Router'
import { ContentType } from '../utils'

export function withHttpRouteExceptionHandler<R, E>(
  routes: Http.Routes<R, E>
): Http.Routes<R, Exclude<E, HttpRouteException>> {
  return Http.addMiddleware_(routes, (cont) => (ctx, next) =>
    I.catchAll_(cont(ctx, next), (e) =>
      I.gen(function* ($) {
        yield* $(I.total(() => console.log(e)))
        if (isHttpRouteException(e)) {
          yield* $(ctx.res.status(e.status))
          yield* $(
            I.catchAll_(ctx.res.set({ 'Content-Type': ContentType.TEXT_PLAIN }), (_) =>
              I.andThen_(ctx.res.end(), I.die(_))
            )
          )
          yield* $(I.catchAll_(ctx.res.write(e.message), (_) => I.andThen_(ctx.res.end(), I.die(_))))
          yield* $(ctx.res.end())
        } else {
          yield* $(I.fail(<Exclude<E, HttpRouteException>>e))
        }
      })
    )
  )
}

export function drain<R>(_: Http.Routes<R, HttpRouteException>) {
  return Http.drain(withHttpRouteExceptionHandler(_))
}
