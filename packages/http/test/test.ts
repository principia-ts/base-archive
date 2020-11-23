import "@principia/prelude/Operators";

import { tag } from "@principia/core/Has";
import * as O from "@principia/core/Option";
import * as R from "@principia/core/Record";
import * as T from "@principia/core/Task";
import * as M from "@principia/core/Task/Managed";
import { flow } from "@principia/prelude";
import * as fs from "fs";
import * as path from "path";
import * as url from "url";

import * as Http from "../src";
import { withHttpRouteExceptionHandler } from "../src/middleware/HttpRouteExceptionHandler";
import { UrlQuery, withQueryParser } from "../src/middleware/QueryParser";

interface Env {
  id: string;
}
const Env = tag<Env>();

const withEnv = Http.addRoute(
  ({ req }) => req.url === "/env",
  ({ res }) =>
    T.gen(function* ($) {
      const { id } = yield* $(Env);
      yield* $(
        T.total(() => {
          res.statusCode = 200;
          res.end(id);
        })
      );
    })
);

const withImage = Http.addRoute(
  ({ req }) => req.url ? url.parse(req.url).pathname === "/image" : false,
  ({ res }) =>
    M.gen(function* ($) {
      const { query } = yield* $(UrlQuery);
      const name = (query as O.Option<Record<"image", string>>)
        ["|>"](O.chain(R.lookup("image")))
        ["|>"](O.getOrElse(() => "image"));
      const stream = yield* $(
        M.make_(
          T.total(() => fs.createReadStream(path.resolve(process.cwd(), `test/${name}.jpg`))),
          (rs) =>
            T.total(() => {
              rs.close();
            })
        )
      );

      yield* $(
        T.async<unknown, Error, void>((resolve) => {
          stream.on("error", (err) => {
            resolve(T.fail(err));
          });
          stream.on("end", () => {
            resolve(T.unit());
          });
          stream.pipe(res);
        })
      );
    })
      ["|>"](
        M.use(() =>
          T.async<unknown, Error, void>((resolve) => {
            res.on("close", () => {
              res.statusCode = 200;
              res.setHeader("Content-Type", "image/jpeg");
              res.end();
              resolve(T.unit());
            });
            res.on("error", (err) => {
              resolve(T.fail(err));
            });
          })
        )
      )
      ["|>"](
        T.catchAll((err) =>
          T.fail<Http.HttpRouteException>({
            _tag: "HttpRouteException",
            status: 400,
            message: `Image stream failed with error\n${err}`
          })
        )
      )
);

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

const withAll = flow(
  withCatchAll,
  withHome,
  withQuery,
  withException,
  withEnv,
  withImage,
  withHttpRouteExceptionHandler,
  withQueryParser
);

const ServerConfig = Http.serverConfig({
  port: 4000,
  host: "0.0.0.0"
});

const Server = Http.Http["<<<"](ServerConfig);

Http.empty["|>"](withAll)
  ["|>"](Http.drain)
  ["|>"](T.giveLayer(Server))
  ["|>"](T.giveService(Env)({ id: "this is an actual real user id" }))
  ["|>"](T.runMain);
