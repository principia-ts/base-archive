import type { Context } from "../Context";
import type { Method } from "./model";

export function matchUrl(url: RegExp, methods: ReadonlyArray<Method> = []) {
  return (ctx: Context) =>
    ctx.req.url
      ? methods.length === 0
        ? url.test(ctx.req.url)
        : ctx.req.method
        ? url.test(ctx.req.url) && (<string[]>methods).includes(ctx.req.method.toUpperCase())
        : false
      : false;
}
