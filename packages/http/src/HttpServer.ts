import type { Has } from '@principia/base/Has'
import type { Queue } from '@principia/io/Queue'

import { pipe } from '@principia/base/Function'
import { tag } from '@principia/base/Has'
import * as Ex from '@principia/io/Exit'
import * as I from '@principia/io/IO'
import * as Ref from '@principia/io/IORef'
import * as RefM from '@principia/io/IORefM'
import * as L from '@principia/io/Layer'
import * as M from '@principia/io/Managed'
import * as Q from '@principia/io/Queue'
import * as http from 'http'
import * as net from 'net'

import { HttpConnection } from './HttpConnection'
import { HttpRequest } from './HttpRequest'
import { HttpResponse } from './HttpResponse'

export interface HttpServerConfig {
  readonly host: string
  readonly port: number
}

export const HttpServerConfig = tag<HttpServerConfig>()

export function serverConfig(config: HttpServerConfig): L.Layer<unknown, never, Has<HttpServerConfig>> {
  return L.succeed(HttpServerConfig)(config)
}

export interface HttpServer {
  readonly server: http.Server
  readonly queue: Queue<HttpConnection>
}

export const HttpServerTag = tag<HttpServer>()

export function HttpServer({ host, port }: HttpServerConfig): L.Layer<unknown, never, Has<HttpServer>> {
  return L.fromRawManaged(
    pipe(
      I.gen(function* (_) {
        const queue   = yield* _(Q.makeUnbounded<HttpConnection>())
        const runtime = yield* _(I.runtime<unknown>())
        const server  = yield* _(
          I.effectTotal(() => {
            return http.createServer((req, res) => {
              runtime.run(
                I.gen(function* (_) {
                  const reqRef = yield* _(Ref.make(req))
                  const resRef = yield* _(RefM.make(res))
                  yield* _(queue.offer(new HttpConnection(reqRef, resRef)))
                })
              )
            })
          })
        )
        yield* _(
          I.effectAsync<unknown, never, void>((k) => {
            function clean() {
              server.removeListener('error', onError)
              server.removeListener('listening', onDone)
            }
            function onError(error: Error) {
              clean()
              k(I.die(error))
            }
            function onDone() {
              clean()
              k(I.unit())
            }

            server.listen(port, host).once('error', onError).once('listening', onDone)
          })
        )
        return { queue, server }
      }),
      M.make(({ queue, server }) =>
        pipe(
          I.effectAsync<unknown, never, void>((k) => {
            server.close((error) => {
              if (error) {
                k(I.die(error))
              } else {
                k(I.unit())
              }
            })
          }),
          I.andThen(queue.shutdown)
        )
      ),
      M.map(HttpServerTag.of)
    )
  )
}

