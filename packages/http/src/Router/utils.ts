import * as T from "@principia/core/AIO";

import type { Context } from "../Context";
import type { Method } from "../utils";

export function matchUrl(url: RegExp, methods: ReadonlyArray<Method> = []) {
  return (ctx: Context): T.IO<boolean> =>
    T.gen(function* ($) {
      const urlString = yield* $(ctx.req.urlString);
      const method = yield* $(ctx.req.method);
      return methods.length === 0
        ? url.test(urlString)
        : url.test(urlString) && (<string[]>methods).includes(method.toUpperCase());
    });
}
