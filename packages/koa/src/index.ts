import type { Erase } from "@principia/base/util/types";
import type { HttpRouteException } from "@principia/http";
import type * as http from "http";

import * as A from "@principia/base/data/Array";
import { pipe } from "@principia/base/data/Function";
import * as H from "@principia/base/data/Has";
import { Request, Response } from "@principia/http";
import * as C from "@principia/io/Cause";
import * as Ex from "@principia/io/Exit";
import * as I from "@principia/io/IO";
import * as L from "@principia/io/Layer";
import * as M from "@principia/io/Managed";
import koa from "koa";
import koaBodyParser from "koa-bodyparser";
import koaCompose from "koa-compose";
import KoaRouter from "koa-router";

export interface RouteError<E> {
  readonly body: E;
  readonly status: number;
}

export interface RouteResponse<A> {
  readonly body: A;
  readonly status: number;
}

export interface Koa {
  readonly app: I.UIO<koa>;
  readonly server: I.UIO<http.Server>;
}

export const Koa = H.tag<Koa>();

export interface KoaConfig {
  readonly middleware: ReadonlyArray<koa.Middleware<koa.ParameterizedContext<any, any>>>;
  readonly onClose: ReadonlyArray<I.UIO<void>>;
  readonly parent?: KoaRouter;
  readonly router: KoaRouter;
}

export const KoaConfig = H.tag<KoaConfig>();

export interface Context<C = koa.DefaultContext> {
  readonly engine: koa.ParameterizedContext<any, C>;
  readonly req: Request;
  readonly res: Response;
}

export const Context = H.tag<Context>();

export type Method = "get" | "post" | "put" | "patch" | "delete";

export function route<R, A>(
  method: Method,
  path: string,
  handler: I.IO<R, HttpRouteException, RouteResponse<A> | void>
): L.Layer<Erase<R, H.Has<Context>> & H.Has<KoaConfig>, never, H.Has<KoaConfig>> {
  return L.fromEffect(KoaConfig)(
    I.gen(function* (_) {
      const config = yield* _(KoaConfig);
      const env = yield* _(I.ask<R>());
      yield* _(
        I.total(() => {
          config.router[method](
            path,
            koaBodyParser(),
            async (ctx) =>
              await pipe(
                handler,
                I.give(env),
                I.giveService(Context)({
                  engine: ctx,
                  req: new Request(ctx.req),
                  res: new Response(ctx.res)
                }),
                I.onExit(
                  Ex.fold(
                    C.fold(
                      () =>
                        I.total(() => {
                          ctx.status = 500;
                          ctx.body = { status: "empty" };
                        }),
                      (error) =>
                        I.total(() => {
                          ctx.status = error.status;
                          ctx.body = error.message;
                        }),
                      (error) =>
                        I.total(() => {
                          ctx.status = 500;
                          ctx.body = { status: "aborted", with: error };
                        }),
                      (_) =>
                        I.total(() => {
                          ctx.status = 500;
                          ctx.body = { status: "interrupted" };
                        }),
                      (_, r) => r,
                      (_, r) => r,
                      (_) => _
                    ),
                    (r) =>
                      r
                        ? I.total(() => {
                            ctx.status = r.status;
                            ctx.body = r.body;
                          })
                        : I.unit()
                  )
                ),
                I.catchAll((ex) =>
                  I.total(() => {
                    ctx.status = ex.status;
                    ctx.body = ex.message;
                  })
                ),
                I.runPromise
              )
          );
        })
      );
      return yield* _(I.total(() => config));
    })
  );
}

function _subRoute<R, E>(
  path: string,
  routes: L.Layer<R & H.Has<KoaConfig>, E, void>
): I.IO<R & H.Has<KoaConfig>, E, void> {
  return pipe(
    I.asksServiceM(KoaConfig)((config) =>
      I.total(() => {
        config.parent!.use(path, config.router.allowedMethods());
        config.parent!.use(path, config.router.routes());
      })
    ),
    I.giveLayer(routes),
    I.giveServiceM(KoaConfig)(
      I.asksService(KoaConfig)((config) => ({
        ...config,
        parent: config.router,
        router: new KoaRouter<any, {}>()
      }))
    )
  );
}

export function subRoute<R, E>(
  path: string,
  op: L.Layer<R & H.Has<KoaConfig>, E, void>
): L.Layer<R & H.Has<KoaConfig>, E, void> {
  return L.fromRawEffect(_subRoute(path, op));
}

export function use<State = koa.DefaultState, Custom = koa.DefaultContext>(
  m: koa.Middleware<koa.ParameterizedContext<State, Custom>>
): L.Layer<H.Has<KoaConfig>, never, H.Has<KoaConfig>> {
  return L.fromEffect(KoaConfig)(
    I.asksServiceM(KoaConfig)((config) =>
      I.total(() => ({
        ...config,
        middleware: A.append_(config.middleware, m)
      }))
    )
  );
}

export function useM<R, E, A>(
  middleware: (cont: I.UIO<void>) => I.IO<R, E, A>
): L.Layer<Erase<R, H.Has<Context>> & H.Has<KoaConfig>, never, H.Has<KoaConfig>> {
  return L.fromEffect(KoaConfig)(
    I.gen(function* (_) {
      const config = yield* _(KoaConfig);
      const env = yield* _(I.ask<R>());
      const m: koa.Middleware = async (ctx, next) =>
        await pipe(
          middleware(I.fromPromiseDie(next)),
          I.give(env),
          I.giveService(Context)({
            engine: ctx,
            req: new Request(ctx.req),
            res: new Response(ctx.res)
          }),
          I.runPromise
        );
      return yield* _(
        I.total(() => ({
          ...config,
          middleware: A.append_(config.middleware, m)
        }))
      );
    })
  );
}

export interface ServerError {
  readonly _tag: "ServerError";
  readonly error: Error;
}

export function live(
  port: number,
  hostname: string
): L.Layer<H.Has<KoaConfig>, ServerError, H.Has<Koa>> {
  return L.fromManaged(Koa)(
    pipe(
      I.gen(function* (_) {
        const config = yield* _(KoaConfig);
        return yield* _(
          I.async<unknown, ServerError, { app: koa; server: http.Server }>((cb) => {
            const app = new koa();
            app.use(koaCompose([...config.middleware]));
            if (config.parent) {
              app.use(config.parent.allowedMethods());
              app.use(config.parent.routes());
            } else {
              app.use(config.router.allowedMethods());
              app.use(config.router.routes());
            }

            const server = app.listen(port, hostname, (error?: Error) =>
              error ? cb(I.fail({ _tag: "ServerError", error })) : cb(I.succeed({ app, server }))
            );
          })
        );
      }),
      I.makeUninterruptible,
      M.make(({ server }) =>
        pipe(
          I.async<unknown, ServerError, void>((cb) => {
            server.close((err) =>
              err ? cb(I.fail({ _tag: "ServerError", error: err })) : cb(I.unit())
            );
          }),
          I.orDie
        )
      ),
      M.map(({ app, server }) => ({
        app: I.total(() => app),
        server: I.total(() => server)
      }))
    )
  );
}
