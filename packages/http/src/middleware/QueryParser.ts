import type { Has } from "@principia/core/Has";
import { tag } from "@principia/core/Has";
import * as O from "@principia/core/Option";
import * as T from "@principia/core/Task";
import { pipe } from "@principia/prelude";
import type { Erase } from "@principia/prelude/Utils";
import * as qs from "querystring";
import * as url from "url";

import type { HttpRouteException } from "../exceptions";
import * as Http from "../Router";

export interface UrlQuery {
  query: O.Option<qs.ParsedUrlQuery>;
}

export const UrlQuery = tag<UrlQuery>();

export function withQueryParser<R, E>(
  routes: Http.Routes<R, E>
): Http.Routes<Erase<R, Has<UrlQuery>>, E | HttpRouteException> {
  return Http.addMiddleware_(routes, (cont) => ({ req, res }, next) => {
    return T.gen(function* ($) {
      const url = yield* $(req.url);
      const query = pipe(
        O.fromNullable(url.query),
        O.map((q) => (typeof q === "string" ? qs.parse(q) : q))
      );
      yield* $(T.giveService(UrlQuery)({ query })(cont({ req, res }, next)));
    });
  });
}
