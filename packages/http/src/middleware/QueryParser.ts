import type { Has } from "@principia/core/Has";
import { tag } from "@principia/core/Has";
import * as O from "@principia/core/Option";
import * as T from "@principia/core/Task";
import { pipe } from "@principia/prelude";
import type { Erase } from "@principia/prelude/Utils";
import * as qs from "querystring";
import * as url from "url";

import * as Http from "../Router";

export interface UrlQuery {
  query: O.Option<qs.ParsedUrlQuery>;
}

export const UrlQuery = tag<UrlQuery>();

export function withQueryParser<R, E>(
  routes: Http.Routes<R, E>
): Http.Routes<Erase<R, Has<UrlQuery>>, E> {
  return Http.addMiddleware_(routes, (cont) => ({ req, res }, next) => {
    const query = pipe(
      O.fromNullable(req.url),
      O.chainNullableK(url.parse),
      O.chainNullableK((url) => url.query),
      O.map((q) => (typeof q === "string" ? qs.parse(q) : q))
    );
    return T.giveService(UrlQuery)({ query })(cont({ req, res }, next));
  });
}
