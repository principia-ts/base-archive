import "@principia/prelude/Operators";

import * as T from "@principia/core/Task";
import * as url from "url";

import * as Http from "../src";
import { withHttpRouteExceptionHandler } from "../src/middleware/HttpRouteExceptionHandler";
import { UrlQuery, withQueryParser } from "../src/middleware/QueryParser";

const withHome = Http.addRoute(
  ({ req }) => req.url === "/",
  (ctx) =>
    T.total(() => {
      ctx.res.end("Hello world!");
    })
);

const withQuery = Http.addRoute(
  ({ req }) => (req.url ? url.parse(req.url).pathname === "/query" : false),
  ({ res }) =>
    T.gen(function* ($) {
      const { query } = yield* $(UrlQuery);
      return yield* $(
        T.total(() => {
          res.statusCode = 200;
          res.end(JSON.stringify(query));
        })
      );
    })
);

const withException = Http.addRoute(
  ({ req }) => req.url === "/exception",
  () =>
    T.fail<Http.HttpRouteException>({
      _tag: "HttpRouteException",
      status: 400,
      message: "an exception was thrown"
    })
);

const withCatchAll = Http.addRoute(Http.matchUrl(/(.*)/), (ctx) =>
  T.total(() => {
    ctx.res.statusCode = 404;
    ctx.res.end("404");
  })
);

const ServerConfig = Http.serverConfig({
  port: 4000,
  host: "0.0.0.0"
});

const Server = Http.Http["<<<"](ServerConfig);

Http.empty["|>"](withCatchAll)
  ["|>"](withQuery)
  ["|>"](withException)
  ["|>"](withHome)
  ["|>"](withHttpRouteExceptionHandler)
  ["|>"](withQueryParser)
  ["|>"](Http.drain)
  ["|>"](T.giveLayer(Server))
  ["|>"](T.runMain);
