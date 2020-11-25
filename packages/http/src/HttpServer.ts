import { pipe } from "@principia/core/Function";
import type { Has } from "@principia/core/Has";
import { tag } from "@principia/core/Has";
import * as T from "@principia/core/Task";
import * as Exit from "@principia/core/Task/Exit";
import * as L from "@principia/core/Task/Layer";
import * as M from "@principia/core/Task/Managed";
import * as Q from "@principia/core/Task/XQueue";
import { intersect } from "@principia/core/Utils";
import * as http from "http";

import type { Context } from "./Context";
import { Request, Response } from "./Context";

export interface ServerConfig {
  port: number;
  hostName: string;
}

export const ServerConfig = tag<ServerConfig>();

export function serverConfig(config: ServerConfig): L.Layer<unknown, never, Has<ServerConfig>> {
  return L.create(ServerConfig).pure(config);
}

export interface Server {
  server: http.Server;
}

export const Server = tag<Server>();

export interface RequestQueue {
  queue: Q.Queue<Context>;
}

export const RequestQueue = tag<RequestQueue>();

export const Http = L.fromRawManaged(
  M.gen(function* ($) {
    const queue = yield* $(Q.makeUnbounded<Context>());
    const server = yield* $(
      T.total(() =>
        http.createServer((req, res) => {
          T.run(queue.offer({ req: new Request(req), res: new Response(res) }));
        })
      )
    );
    const config = yield* $(ServerConfig);

    const startServer = T.async<unknown, never, void>((resolve) => {
      function clean() {
        server.removeListener("error", onError);
        server.removeListener("listening", onDone);
      }

      function onError(error: Error) {
        clean();
        resolve(T.die(error));
      }

      function onDone() {
        clean();
        resolve(T.unit());
      }

      server.listen(config.port, config.hostName);

      server.once("error", onError);
      server.once("listening", onDone);
    });

    const managedServer = pipe(
      M.make_(startServer, () =>
        pipe(
          T.async<unknown, never, void>((resolve) => {
            server.close((err) => (err ? resolve(T.die(err)) : resolve(T.unit())));
          }),
          T.result,
          T.both(T.result(queue.shutdown)),
          T.chain(([ea, eb]) => T.done(Exit.both_(ea, eb)))
        )
      ),
      M.map(() => intersect(Server.of({ server }), RequestQueue.of({ queue })))
    );

    return yield* $(managedServer);
  })
);
