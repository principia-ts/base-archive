import type { Context } from "../Context";
import type { Method } from "../utils";
import type { UIO } from "@principia/io/IO";

import * as I from "@principia/io/IO";

export function matchUrl(url: RegExp, methods: ReadonlyArray<Method> = []) {
  return (ctx: Context<{}>): UIO<boolean> =>
    I.gen(function* ($) {
      const urlString = yield* $(ctx.req.urlString);
      const method = yield* $(ctx.req.method);
      return methods.length === 0
        ? url.test(urlString)
        : url.test(urlString) && (<string[]>methods).includes(method.toUpperCase());
    });
}
