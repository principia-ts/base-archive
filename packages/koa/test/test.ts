import type { HttpRouteException } from "@principia/http";

import "@principia/base/unsafe/Operators";

import { pipe } from "@principia/base/data/Function";
import * as C from "@principia/io/Chunk";
import * as I from "@principia/io/IO";
import * as L from "@principia/io/Layer";
import * as S from "@principia/io/Stream";
import * as NFS from "@principia/node/fs";
import * as ZL from "@principia/node/zlib";
import KoaRouter from "koa-router";
import { runMain } from "module";
import * as path from "path";

import * as Koa from "../src";

const home = Koa.route(
  "get",
  "/file",
  I.gen(function* (_) {
    const { res, ctx } = yield* _(Koa.Context);
    const p = path.resolve(process.cwd(), ctx.request.query["name"]);
    const exists = yield* _(
      NFS.stat(p)
        ["|>"](I.map((stats) => stats.isFile()))
        ["|>"](I.catchAll((_) => I.succeed(false)))
    );
    yield* _(
      I.if_(
        () => exists,
        () =>
          res
            .status(200)
            ["|>"](I.andThen(res.set({ "content-type": "text/plain", "content-encoding": "gzip" })))
            ["|>"](I.andThen(res.pipeFrom(NFS.createReadStream(p)["|>"](ZL.gzip())))),
        () =>
          I.fail<HttpRouteException>({
            _tag: "HttpRouteException",
            message: `File at ${p} is not a file or does not exist`,
            status: 500
          })
      )
    );
    yield* _(res.end());
  })
);
const middleware = Koa.useM((cont) =>
  I.gen(function* (_) {
    const { ctx } = yield* _(Koa.Context);
    yield* _(I.total(() => console.log(ctx.req.rawHeaders)));
    yield* _(cont);
  })
);

const liveKoa = Koa.live(4000, "localhost")
  ["<<<"](middleware)
  ["<<<"](home)
  ["<<<"](L.pure(Koa.KoaConfig)({ middleware: [], onClose: [], router: new KoaRouter() }));

pipe(I.never, I.giveLayer(liveKoa), (x) => I.run(x, (ex) => console.log(ex)));
