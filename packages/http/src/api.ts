import type { DecodeErrors } from "@principia/core/DecodeError";
import { SyncDecoderF } from "@principia/core/DecodeError";
import type { Has } from "@principia/core/Has";
import * as T from "@principia/core/Task";
import * as M from "@principia/model";
import type { Show } from "@principia/prelude";
import { flow, pipe } from "@principia/prelude";

import { Context } from "./Context";
import type { HttpRouteException } from "./exceptions/HttpRouteException";

export const readBody = T.gen(function* ($) {
  const { req } = yield* $(Context);
  return yield* $(
    T.asyncInterrupt<unknown, never, Buffer>((resolve) => {
      const body: Uint8Array[] = [];
      function onData(chunk: Uint8Array) {
        body.push(chunk);
      }
      function onEnd() {
        resolve(T.succeed(Buffer.concat(body)));
      }

      req.on("data", onData);
      req.on("end", onEnd);

      return T.total(() => {
        req.removeListener("data", onData);
        req.removeListener("end", onEnd);
      });
    })
  );
});

export const parseJsonBody = T.gen(function* ($) {
  const body = yield* $(readBody);
  return yield* $(
    T.partial_(
      () => JSON.parse(body.toString("utf-8")),
      (err): HttpRouteException => ({
        _tag: "HttpRouteException",
        status: 400,
        message: `Body cannot be parsed as Json:\n\t${String(err)}`
      })
    )
  );
});

export function decodeJsonBody<E, A>(_: M.M<{}, E, A>, S: Show<DecodeErrors>) {
  const decode = M.getDecoder(_)(SyncDecoderF).decode;
  return T.gen(function* ($) {
    const body = yield* $(parseJsonBody);
    return yield* $(
      pipe(
        body,
        decode,
        T.catchAll((e) => {
          const error = S.show(e);
          return T.fail<HttpRouteException>({
            _tag: "HttpRouteException",
            status: 400,
            message: `Malformed body:\n\t${error}`
          });
        })
      )
    );
  });
}

export function encodeJsonResponse<E, A>(
  _: M.M<{}, E, A>
): (a: A) => T.Task<Has<Context>, never, void> {
  const encode = M.getEncoder(_).encode;
  return flow(encode, (l) =>
    T.gen(function* ($) {
      const { res } = yield* $(Context);
      return yield* $(
        T.total(() => {
          res.setHeader("content-type", "application/json");
          res.end(JSON.stringify(l));
        })
      );
    })
  );
}
