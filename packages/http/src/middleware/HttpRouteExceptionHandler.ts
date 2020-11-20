import * as T from "@principia/core/Task";

import type { HttpRouteException } from "../exceptions/HttpRouteException";
import { isHttpRouteException } from "../exceptions/HttpRouteException";
import * as Http from "../router";

export function withHttpRouteExceptionHandler<R, E>(routes: Http.Routes<R, E>) {
  return Http.addMiddleware_(routes, (cont) => (ctx, next) =>
    T.catchAll_(cont(ctx, next), (e) =>
      T.suspend(() => {
        if (isHttpRouteException(e)) {
          ctx.res.statusCode = e.status;
          ctx.res.end(e.message);
          return T.unit();
        } else {
          return T.fail(<Exclude<E, HttpRouteException>>e);
        }
      })
    )
  );
}

export function drain<R>(_: Http.Routes<R, HttpRouteException>) {
  return Http.drain(withHttpRouteExceptionHandler(_));
}
