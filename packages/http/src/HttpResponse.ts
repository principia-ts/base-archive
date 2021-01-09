import type { Byte } from '@principia/base/Byte'
import type { ReadonlyRecord } from '@principia/base/Record'
import type { Chunk } from '@principia/io/Chunk'
import type { FIO, IO, UIO } from '@principia/io/IO'
import type { URefM } from '@principia/io/IORefM'
import type * as http from 'http'
import type { Readable } from 'stream'

import * as O from '@principia/base/Option'
import * as T from '@principia/io/IO'
import * as Ref from '@principia/io/IORef'
import * as RefM from '@principia/io/IORefM'
import * as M from '@principia/io/Managed'
import * as Q from '@principia/io/Queue'
import * as S from '@principia/io/Stream'
import * as Pull from '@principia/io/Stream/Pull'
import * as NS from '@principia/node/stream'

import { HttpException } from './HttpException'
import * as Status from './StatusCode'

interface CloseEvent {
  readonly _tag: 'Close'
}

interface ErrorEvent {
  readonly _tag: 'Error'
  readonly error: Error
}

interface DrainEvent {
  readonly _tag: 'Drain'
}

interface FinishEvent {
  readonly _tag: 'Finish'
}

interface PipeEvent {
  readonly _tag: 'Pipe'
  readonly src: Readable
}

interface UnpipeEvent {
  readonly _tag: 'Unpipe'
  readonly src: Readable
}

export type ResponseEvent = CloseEvent | DrainEvent | ErrorEvent | FinishEvent | PipeEvent | UnpipeEvent

export class HttpResponse {
  readonly _res: URefM<http.ServerResponse>

  eventStream: M.Managed<unknown, never, T.UIO<S.Stream<unknown, never, ResponseEvent>>>

  constructor(res: http.ServerResponse) {
    this._res        = RefM.unsafeMake(res)
    this.eventStream = S.broadcastDynamic_(
      new S.Stream(
        M.gen(function* ($) {
          const queue = yield* $(Q.makeUnbounded<ResponseEvent>())
          const done  = yield* $(Ref.make(false))
          yield* $(
            T.effectTotal(() => {
              res.on('close', () => {
                T.run(queue.offer({ _tag: 'Close' }))
              })
              res.on('drain', () => {
                T.run(queue.offer({ _tag: 'Drain' }))
              })
              res.on('finish', () => {
                T.run(queue.offer({ _tag: 'Finish' }))
              })
              res.on('error', (error) => {
                T.run(queue.offer({ _tag: 'Error', error }))
              })
              res.on('pipe', (src) => {
                T.run(queue.offer({ _tag: 'Pipe', src }))
              })
              res.on('unpipe', (src) => {
                T.run(queue.offer({ _tag: 'Unpipe', src }))
              })
            })
          )
          return T.flatMap_(done.get, (b) =>
            b
              ? Pull.end
              : T.flatMap_(
                queue.take,
                (event): T.UIO<Chunk<ResponseEvent>> => {
                  if (event._tag === 'Close') {
                    return T.andThen_(done.set(true), Pull.emit(event))
                  }
                  return Pull.emit(event)
                }
              )
          )
        })
      ),
      1
    )
  }

  access<R, E, A>(f: (res: http.ServerResponse) => IO<R, E, A>): IO<R, E, A> {
    return T.flatMap_(this._res.get, f)
  }

  modify<R, E>(f: (res: http.ServerResponse) => IO<R, E, http.ServerResponse>): IO<R, E, void> {
    return RefM.update_(this._res, f)
  }

  status(s: Status.StatusCode): UIO<void> {
    return RefM.update_(this._res, (res) =>
      T.effectTotal(() => {
        // eslint-disable-next-line functional/immutable-data
        res.statusCode = s.code
        return res
      })
    )
  }

  get headers(): UIO<http.OutgoingHttpHeaders> {
    return T.map_(this._res.get, (res) => res.getHeaders())
  }

  get(name: string): UIO<O.Option<http.OutgoingHttpHeader>> {
    return T.map_(this._res.get, (res) => O.fromNullable(res.getHeaders()[name]))
  }

  set(headers: ReadonlyRecord<string, http.OutgoingHttpHeader>): FIO<HttpException, void> {
    return RefM.update_(this._res, (res) =>
      T.effectSuspendTotal(() => {
        const hs = Object.entries(headers)
        try {
          for (let i = 0; i < hs.length; i++) {
            res.setHeader(hs[i][0], hs[i][1])
          }
          return T.succeed(res)
        } catch (err) {
          return T.fail(
            new HttpException('Failed to set headers', 'HttpResponse#set', {
              status: Status.InternalServerError,
              originalError: err
            })
          )
        }
      })
    )
  }

  has(name: string): UIO<boolean> {
    return T.map_(this._res.get, (res) => res.hasHeader(name))
  }

  write(chunk: string | Buffer): FIO<HttpException, void> {
    return T.flatMap_(this._res.get, (res) =>
      T.effectAsync<unknown, HttpException, void>((cb) => {
        res.write(chunk, (err) =>
          err
            ? cb(
              T.fail(
                new HttpException('Failed to write body', 'HttpResponse#write', {
                  status: Status.InternalServerError,
                  originalError: err
                })
              )
            )
            : cb(T.unit())
        )
      })
    )
  }

  pipeFrom<R, E>(stream: S.Stream<R, E, Byte>): IO<R, HttpException, void> {
    return T.catchAll_(
      T.flatMap_(this._res.get, (res) =>
        S.run_(
          stream,
          NS.sinkFromWritable(() => res)
        )
      ),
      (e) =>
        T.fail(
          new HttpException('Failed to write response body', 'HttpResponse#pipeFrom', {
            status: Status.InternalServerError,
            originalError: e
          })
        )
    )
  }

  end(): UIO<void> {
    return T.flatMap_(this._res.get, (res) =>
      T.effectTotal(() => {
        res.end()
      })
    )
  }
}
