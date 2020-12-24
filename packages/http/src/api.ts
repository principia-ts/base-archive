import type { Context } from "./Context";
import type { HttpRouteException } from "./exceptions/HttpRouteException";
import type { Has, Tag } from "@principia/base/data/Has";
import type { Show } from "@principia/base/data/Show";
import type { DecodeErrors } from "@principia/codec/DecodeErrors";
import type { IO } from "@principia/io/IO";

import { flow, pipe } from "@principia/base/data/Function";
import { getDecodeErrorsValidation } from "@principia/codec/DecodeErrors";
import * as C from "@principia/io/Chunk";
import * as I from "@principia/io/IO";
import * as S from "@principia/io/Stream";
import * as Sy from "@principia/io/Sync";
import * as M from "@principia/model";

export const readBody = <T>(tag: Tag<Context<T>>) =>
  I.gen(function* ($) {
    const { req } = yield* $(tag);
    const bytes = yield* $(S.runCollect(req.stream));
    return bytes;
  });

export const parseJsonBody = <T>(tag: Tag<Context<T>>) =>
  I.gen(function* ($) {
    const body = yield* $(readBody(tag));
    return yield* $(
      I.partial_(
        () => JSON.parse(C.asBuffer(body).toString("utf-8")),
        (err): HttpRouteException => ({
          _tag: "HttpRouteException",
          status: 400,
          message: `Body cannot be parsed as Json:\n\t${String(err)}`
        })
      )
    );
  });

const SyM = getDecodeErrorsValidation({ ...Sy.MonadFail, ...Sy.Bifunctor, ...Sy.Fallible });

export function decodeJsonBody<T, E, A>(
  tag: Tag<Context<T>>,
  _: M.M<{}, E, A>,
  S: Show<DecodeErrors>
) {
  const decode = M.getDecoder(_)(SyM).decode;
  return I.gen(function* ($) {
    const body = yield* $(parseJsonBody(tag));
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

export function encodeJsonResponse<T, E, A>(
  tag: Tag<Context<T>>,
  _: M.M<{}, E, A>
): (a: A) => IO<Has<Context<T>>, HttpRouteException, void> {
  const encode = M.getEncoder(_).encode;
  return flow(encode, (l) =>
    I.gen(function* ($) {
      const { res } = yield* $(tag);
      return yield* $(
        res
          .set({ "content-type": "application/json" })
          ["|>"](I.andThen(res.write(JSON.stringify(l))))
          ["|>"](I.andThen(res.end()))
      );
    })
  );
}
