import * as T from "@principia/core/Task";

import type { HttpRouteException } from "../exceptions/HttpRouteException";
import { isHttpRouteException } from "../exceptions/HttpRouteException";
import * as Http from "../Router";

export function withHttpRouteExceptionHandler<R, E>(
  routes: Http.Routes<R, E>
): Http.Routes<R, Exclude<E, HttpRouteException>> {
  return Http.addMiddleware_(routes, (cont) => (ctx, next) =>
    T.catchAll_(cont(ctx, next), (e) =>
      T.gen(function* ($) {
        if (isHttpRouteException(e)) {
          yield* $(ctx.res.status(e.status));
          yield* $(ctx.res.write(e.message)["|>"](T.orDie));
          yield* $(ctx.res.end());
        } else {
          yield* $(T.fail(<Exclude<E, HttpRouteException>>e));
        }
      })
    )
  );
}

export function drain<R>(_: Http.Routes<R, HttpRouteException>) {
  return Http.drain(withHttpRouteExceptionHandler(_));
}
