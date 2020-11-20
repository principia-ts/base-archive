import "@principia/prelude/Operators";

import * as T from "@principia/core/Task";

import * as Http from "../src";

const withHome = Http.addRoute(
  ({ req }) => req.url === "/",
  (ctx) =>
    T.total(() => {
      ctx.res.end("Hello world!");
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
  ["|>"](withHome)
  ["|>"](Http.drain)
  ["|>"](T.giveLayer(Server))
  ["|>"](T.runMain);
