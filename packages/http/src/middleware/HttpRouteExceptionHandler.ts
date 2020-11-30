import * as I from "@principia/core/IO";

import type { HttpRouteException } from "../exceptions/HttpRouteException";
import { isHttpRouteException } from "../exceptions/HttpRouteException";
import * as Http from "../Router";
import { ContentType } from "../utils";

export function withHttpRouteExceptionHandler<R, E>(
  routes: Http.Routes<R, E>
): Http.Routes<R, Exclude<E, HttpRouteException>> {
  return Http.addMiddleware_(routes, (cont) => (ctx, next) =>
    I.catchAll_(cont(ctx, next), (e) =>
      I.gen(function* ($) {
        yield* $(I.total(() => console.error(e)));
        if (isHttpRouteException(e)) {
          yield* $(ctx.res.status(e.status));
          yield* $(ctx.res.set({ "Content-Type": ContentType.TEXT_PLAIN })["|>"](I.orDie));
          yield* $(ctx.res.write(e.message)["|>"](I.orDie));
          yield* $(ctx.res.end());
        } else {
          yield* $(I.fail(<Exclude<E, HttpRouteException>>e));
        }
      })
    )
  );
}

export function drain<R>(_: Http.Routes<R, HttpRouteException>) {
  return Http.drain(withHttpRouteExceptionHandler(_));
}
