import type { DecodeErrors } from "@principia/core/DecodeError";
import { SyncDecoderF } from "@principia/core/DecodeError";
import type { Has } from "@principia/core/Has";
import type { IO } from "@principia/core/IO";
import * as I from "@principia/core/IO";
import * as M from "@principia/model";
import type { Show } from "@principia/prelude";
import { flow, pipe } from "@principia/prelude";

import { Context } from "./Context";
import type { HttpRouteException } from "./exceptions/HttpRouteException";

export const readBody = I.gen(function* ($) {
  const { req } = yield* $(Context);
  let removeOnData = I.unit();
  let removeOnEnd = I.unit();
  return yield* $(
    I.asyncM<unknown, never, unknown, never, Buffer>((resolve) =>
      I.onInterrupt_(
        I.gen(function* ($) {
          const body: Uint8Array[] = [];
          removeOnData = yield* $(req.on("data", onData));
          removeOnEnd = yield* $(req.on("end", onEnd));
          function onData(chunk: any) {
            return I.total(() => {
              body.push(chunk);
            });
          }
          function onEnd() {
            return I.total(() => resolve(I.succeed(Buffer.concat(body))));
          }
        }),
        () => I.andThenPar_(removeOnData, removeOnEnd)
      )
    )
  );
});

export const parseJsonBody = I.gen(function* ($) {
  const body = yield* $(readBody);
  return yield* $(
    I.partial_(
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
  return I.gen(function* ($) {
    const body = yield* $(parseJsonBody);
    return yield* $(
      pipe(
        body,
        decode,
        I.catchAll((e) => {
          const error = S.show(e);
          return I.fail<HttpRouteException>({
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
): (a: A) => IO<Has<Context>, HttpRouteException, void> {
  const encode = M.getEncoder(_).encode;
  return flow(encode, (l) =>
    I.gen(function* ($) {
      const { res } = yield* $(Context);
      return yield* $(
        res
          .set({ "content-type": "application/json" })
          ["|>"](I.andThen(res.write(JSON.stringify(l))))
          ["|>"](I.andThen(res.end()))
      );
    })
  );
}
