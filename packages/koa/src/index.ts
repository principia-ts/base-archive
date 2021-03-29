import type { RouterParamContext } from '@koa/router'
import type { Has } from '@principia/base/Has'
import type { NonEmptyArray } from '@principia/base/NonEmptyArray'
import type { _R } from '@principia/base/util/types'
import type { Cause } from '@principia/io/Cause'
import type { Console } from '@principia/io/Console'
import type { Exit } from '@principia/io/Exit'
import type { RuntimeFiber } from '@principia/io/Fiber'
import type { IO, URIO } from '@principia/io/IO'
import type { IOEnv } from '@principia/io/IOEnv'
import type { Supervisor } from '@principia/io/Supervisor'
import type * as http from 'http'
import type { DefaultContext, DefaultState, Middleware, Next, ParameterizedContext } from 'koa'

import '@principia/base/Operators'

import KoaRouter from '@koa/router'
import * as A from '@principia/base/Array'
import { flow, pipe } from '@principia/base/function'
import { tag } from '@principia/base/Has'
import { HttpConnection } from '@principia/http/HttpConnection'
import * as Status from '@principia/http/StatusCode'
import * as Ca from '@principia/io/Cause'
import { putStrLnErr } from '@principia/io/Console'
import * as Ex from '@principia/io/Exit'
import * as Fi from '@principia/io/Fiber'
import * as I from '@principia/io/IO'
import { live as liveIOEnv } from '@principia/io/IOEnv'
import * as L from '@principia/io/Layer'
import * as M from '@principia/io/Managed'
import * as Ref from '@principia/io/Ref'
import * as RefM from '@principia/io/RefM'
import * as Su from '@principia/io/Supervisor'
import koa from 'koa'
import koaCompose from 'koa-compose'

export type Context<S = DefaultState, C = DefaultContext, B = unknown> = ParameterizedContext<S, C, B> &
  RouterParamContext & {
    connection: HttpConnection
  }

export interface ExitHandler<R, S = DefaultState, C = DefaultContext, B = unknown> {
  (ctx: Context<S, C, B>, next: Next): (cause: Cause<never>) => URIO<R & IOEnv, void>
}

export const KoaAppConfigTag = tag<KoaAppConfig>()

export const Methods = {
  all: 'all',
  get: 'get',
  put: 'put',
  post: 'post',
  patch: 'patch',
  delete: 'delete'
} as const

export type Methods = typeof Methods[keyof typeof Methods]

export abstract class KoaAppConfig {
  abstract readonly host: string
  abstract readonly port: number
  abstract readonly exitHandler: ExitHandler<unknown>

  static live<R>(host: string, port: number, exitHandler: ExitHandler<R>): L.Layer<R, never, Has<KoaAppConfig>> {
    return L.fromEffect(KoaAppConfigTag)(
      I.asks(
        (r: R) =>
          new (class extends KoaAppConfig {
            host                              = host
            port                              = port
            exitHandler: ExitHandler<unknown> = (ctx, next) => flow(exitHandler(ctx, next), I.give(r))
          })()
      )
    )
  }
}

export class NodeServerCloseError {
  readonly _tag = 'NodeServerCloseError'
  constructor(readonly error: Error) {}
}

export class NodeServerListenError {
  readonly _tag = 'NodeServerListenError'
  constructor(readonly error: Error) {}
}

export const KoaAppTag = tag<KoaApp>()

export abstract class KoaApp {
  abstract readonly app: koa<DefaultState, Context>
  abstract readonly server: http.Server

  private static _derived = I.deriveLifted(KoaAppTag)([], [], ['app', 'server'])

  static app    = KoaApp._derived.app
  static server = KoaApp._derived.server

  static live: L.Layer<Has<KoaAppConfig> & Has<KoaRouterConfig>, never, Has<KoaApp>> = L.fromManaged(KoaAppTag)(
    M.gen(function* (_) {
      const routerConfig = yield* _(KoaRouterConfigTag)
      const app          = yield* _(
        I.effectTotal(() => {
          const app = new koa<DefaultState, Context>()
          Object.defineProperty(app.context, 'connection', {
            get() {
              const req = Ref.unsafeMakeRef(this.req)
              const res = RefM.unsafeMakeRefM(this.res)
              return new HttpConnection(req, res)
            }
          })
          app.use(koaCompose(A.mutableClone(routerConfig.middleware)))
          if (routerConfig.parentRouter) {
            app.use(routerConfig.parentRouter.allowedMethods())
            app.use(routerConfig.parentRouter.routes())
          } else {
            app.use(routerConfig.router.allowedMethods())
            app.use(routerConfig.router.routes())
          }
          return app
        })
      )
      const { host, port } = yield* _(KoaAppConfigTag)
      const server         = yield* _(
        I.effectAsync<unknown, never, http.Server>((k) => {
          const onError = (error: Error) => {
            k(I.die(new NodeServerListenError(error)))
          }
          const server  = app.listen(port, host, () => {
            k(
              I.effectTotal(() => {
                server.removeListener('error', onError)
                return server
              })
            )
          })
          server.addListener('error', onError)
        })['|>'](
          M.make((server) =>
            I.effectAsync<unknown, never, void>((k) => {
              server.close((error) => {
                if (error) {
                  k(I.die(new NodeServerCloseError(error)))
                } else {
                  k(I.unit())
                }
              })
            })
          )
        )
      )

      return {
        app,
        server
      }
    })
  )
}

export const KoaRuntimeTag = tag<KoaRuntime>()

export abstract class KoaRuntime {
  abstract readonly supervisor: Supervisor<ReadonlyArray<RuntimeFiber<any, any>>>
  abstract readonly runtime: <R>() => IO<R, never, <E, A>(effect: IO<R & IOEnv, E, A>) => Promise<Exit<E, A>>>
  static supervisor = I.deriveLifted(KoaRuntimeTag)([], [], ['supervisor'])

  static runtime<R>() {
    return I.asksServiceM(KoaRuntimeTag)((r) => r.runtime<R>())
  }

  static live: L.Layer<unknown, never, Has<KoaRuntime>> = L.fromManaged(KoaRuntimeTag)(
    M.gen(function* (_) {
      const open       = yield* _(Ref.makeRef(true)['|>'](M.make((ref) => ref.set(false))))
      const supervisor = yield* _(Su.track['|>'](M.makeExit((s) => s.value['>>='](Fi.interruptAll))))

      function runtime<R>() {
        return I.runtime<R>()
          ['<$>']((r) => r.supervised(supervisor))
          ['<$>']((r) => <E, A>(effect: IO<R & IOEnv, E, A>) =>
            I.ifM_(
              open.get,
              () =>
                I.deferTotal(() =>
                  effect['|>'](I.giveLayer(liveIOEnv))
                    ['|>'](r.runFiber)
                    ['|>']((f) => f.await)
                ),
              () => I.succeed(Ex.halt(Ca.empty))
            )
              ['|>'](I.runPromiseExit)
              .then(Ex.flatten)
          )
      }

      return {
        supervisor,
        runtime
      }
    })
  )
}

export type KoaEnv = Has<KoaAppConfig> & Has<KoaApp>

export function Koa(host: string, port: number): L.Layer<Has<KoaRouterConfig>, never, KoaEnv>
export function Koa<R>(
  host: string,
  port: number,
  exitHandler: ExitHandler<R>
): L.Layer<R & Has<KoaRouterConfig>, never, KoaEnv>
export function Koa<R>(
  host: string,
  port: number,
  exitHandler?: ExitHandler<R>
): L.Layer<R & Has<KoaRouterConfig>, never, KoaEnv> {
  return KoaAppConfig.live(host, port, exitHandler ?? defaultExitHandler)['>+>'](KoaApp.live)
}

export function defaultExitHandler(
  ctx: ParameterizedContext<DefaultState, Context>,
  _next: Next
): (cause: Cause<never>) => URIO<Has<Console>, void> {
  return (cause) =>
    I.gen(function* (_) {
      if (Ca.died(cause)) {
        yield* _(putStrLnErr(Ca.pretty(cause)))
      }
      yield* _(ctx.connection.res.status(Status.InternalServerError))
      yield* _(ctx.connection.res.end())
    })
}

export const KoaRouterConfigTag = tag<KoaRouterConfig>()

export abstract class KoaRouterConfig {
  abstract readonly middleware: ReadonlyArray<Middleware<DefaultState, Context>>
  abstract readonly router: KoaRouter<DefaultState, Context>
  abstract readonly parentRouter?: KoaRouter<DefaultState, Context>

  static empty: L.Layer<unknown, never, Has<KoaRouterConfig>> = L.succeed(KoaRouterConfigTag)(
    new (class extends KoaRouterConfig {
      middleware   = []
      router       = new KoaRouter<DefaultState, Context>()
      parentRouter = undefined
    })()
  )
}

export interface RequestHandler<R, S = DefaultState, C = Context, B = unknown> {
  (ctx: ParameterizedContext<S, C, B>, next: Next): URIO<R, void>
}

export type Path = string | RegExp | Array<string | RegExp>

export function route(
  method: Methods
): <Handlers extends NonEmptyArray<RequestHandler<any>>>(
  path: Path,
  ...handlers: Handlers
) => L.Layer<Has<KoaRuntime> & Has<KoaAppConfig> & Has<KoaRouterConfig>, never, Has<KoaRouterConfig>> {
  return (path, ...handlers) =>
    L.fromEffect(KoaRouterConfigTag)(
      I.gen(function* (_) {
        const { runtime }     = yield* _(KoaRuntimeTag)
        const config          = yield* _(KoaRouterConfigTag)
        const { exitHandler } = yield* _(KoaAppConfigTag)
        const run             = yield* _(runtime())
        return yield* _(
          I.effectTotal(() => {
            config.router[method](
              path,
              ...A.map_(
                handlers,
                (h): Middleware<DefaultState, Context> => async (ctx, next) => {
                  await pipe(h(ctx, next), I.onTermination(exitHandler(ctx, next)), run)
                }
              )
            )
            return config
          })
        )
      })
    )
}

type RequestHandlersEnv<Hs extends NonEmptyArray<RequestHandler<any, any, any, any>>> = _R<
  {
    [i in keyof Hs]: [Hs[i]] extends [RequestHandler<infer R, any, any, any>] ? URIO<R, void> : never
  }[number]
>

export function use<Handlers extends NonEmptyArray<RequestHandler<any>>>(
  ...handlers: Handlers
): L.Layer<
  Has<KoaRuntime> & Has<KoaAppConfig> & Has<KoaRouterConfig> & RequestHandlersEnv<Handlers>,
  never,
  Has<KoaRouterConfig>
>
export function use<Handlers extends NonEmptyArray<RequestHandler<any>>>(
  path: Path,
  ...handlers: Handlers
): L.Layer<
  Has<KoaRuntime> & Has<KoaAppConfig> & Has<KoaRouterConfig> & RequestHandlersEnv<Handlers>,
  never,
  Has<KoaRouterConfig>
>
export function use(
  ...args: any[]
): L.Layer<Has<KoaRuntime> & Has<KoaAppConfig> & Has<KoaRouterConfig>, never, Has<KoaRouterConfig>> {
  return L.fromEffect(KoaRouterConfigTag)(
    I.gen(function* (_) {
      const { runtime }     = yield* _(KoaRuntimeTag)
      const config          = yield* _(KoaRouterConfigTag)
      const { exitHandler } = yield* _(KoaAppConfigTag)
      const run             = yield* _(runtime())
      return yield* _(
        I.effectTotal(() => {
          if (typeof args[0] === 'function') {
            config.router.use(
              ...A.map_(
                args,
                (h: RequestHandler<unknown>): Middleware<DefaultState, Context> => async (ctx, next) =>
                  await pipe(h(ctx, next), I.onTermination(exitHandler(ctx, next)), run)
              )
            )
          } else {
            config.router.use(
              args[0],
              ...A.map_(
                args.slice(1),
                (h: RequestHandler<unknown>): Middleware<DefaultState, Context> => async (ctx, next) =>
                  await pipe(h(ctx, next), I.onTermination(exitHandler(ctx, next)), run)
              )
            )
          }
          return config
        })
      )
    })
  )
}
