import type { HttpRouteException } from "../exceptions";
import type { Has } from "@principia/base/data/Has";
import type { ReadonlyRecord } from "@principia/base/data/Record";
import type { Erase } from "@principia/base/util/types";

import * as A from "@principia/base/data/Array";
import { pipe } from "@principia/base/data/Function";
import { tag } from "@principia/base/data/Has";
import * as O from "@principia/base/data/Option";
import * as R from "@principia/base/data/Record";
import * as Str from "@principia/base/data/String";
import * as I from "@principia/io/IO";
import * as qs from "querystring";

import * as Http from "../Router";

export interface UrlQuery {
  urlQuery: O.Option<ReadonlyRecord<string, string>>;
}

export const UrlQuery = tag<UrlQuery>();

export function withQueryParser<R, E>(
  routes: Http.Routes<R, E>
): Http.Routes<Erase<R, Has<UrlQuery>>, E | HttpRouteException> {
  return Http.addMiddleware_(routes, (cont) => (ctx, next) => {
    return I.gen(function* ($) {
      const url = yield* $(ctx.req.url);
      const urlQuery = pipe(
        O.fromNullable(url.query),
        O.map((q) => (typeof q === "string" ? qs.parse(q) : q)),
        O.map((q) =>
          R.foldLeftWithIndex_(q, {} as Record<string, string>, (k, b, a) =>
            a
              ? Array.isArray(a)
                ? { ...b, [k]: A.foldLeft_(a, "", Str.append_) }
                : { ...b, [k]: a }
              : b
          )
        )
      );
      yield* $(I.giveService(UrlQuery)({ urlQuery })(cont(ctx, next)));
    });
  });
}
