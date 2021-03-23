import type { Byte } from '@principia/base/Byte'
import type { ReadonlyRecord } from '@principia/base/Record'
import type { Chunk } from '@principia/io/Chunk'
import type { FIO, IO, UIO } from '@principia/io/IO'
import type * as http from 'http'
import type { Readable } from 'stream'

import { pipe } from '@principia/base/function'
import * as NT from '@principia/base/Newtype'
import * as O from '@principia/base/Option'
import * as I from '@principia/io/IO'
import * as M from '@principia/io/Managed'
import * as Q from '@principia/io/Queue'
import * as Ref from '@principia/io/Ref'
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

export const HttpResponseCompleted = NT.typeDef<void>()('HttpResponseCompleted')
export interface HttpResponseCompleted extends NT.TypeOf<typeof HttpResponseCompleted> {}

export class HttpResponse {
  eventStream: M.Managed<unknown, never, I.UIO<S.Stream<unknown, never, ResponseEvent>>>

  constructor(readonly ref: Ref.URefM<http.ServerResponse>) {
    this.eventStream = pipe(
      ref.get,
      M.fromEffect,
      M.bind((res) =>
        S.broadcastDynamic_(
          new S.Stream(
            M.gen(function* ($) {
              const queue   = yield* $(Q.makeUnbounded<ResponseEvent>())
              const done    = yield* $(Ref.makeRef(false))
              const runtime = yield* $(I.runtime<unknown>())
              yield* $(
                I.effectTotal(() => {
                  res.on('close', () => {
                    runtime.run_(queue.offer({ _tag: 'Close' }))
                  })
                  res.on('drain', () => {
                    runtime.run_(queue.offer({ _tag: 'Drain' }))
                  })
                  res.on('finish', () => {
                    runtime.run_(queue.offer({ _tag: 'Finish' }))
                  })
                  res.on('error', (error) => {
                    runtime.run_(queue.offer({ _tag: 'Error', error }))
                  })
                  res.on('pipe', (src) => {
                    runtime.run_(queue.offer({ _tag: 'Pipe', src }))
                  })
                  res.on('unpipe', (src) => {
                    runtime.run_(queue.offer({ _tag: 'Unpipe', src }))
                  })
                })
              )
              return I.bind_(done.get, (b) =>
                b
                  ? Pull.end
                  : I.bind_(
                      queue.take,
                      (event): I.UIO<Chunk<ResponseEvent>> => {
                        if (event._tag === 'Close') {
                          return I.apr_(done.set(true), Pull.emit(event))
                        }
                        return Pull.emit(event)
                      }
                    )
              )
            })
          ),
          1
        )
      )
    )
  }

  access<R, E, A>(f: (res: http.ServerResponse) => IO<R, E, A>): IO<R, E, A> {
    return I.bind_(this.ref.get, f)
  }

  modify<R, E>(f: (res: http.ServerResponse) => IO<R, E, http.ServerResponse>): IO<R, E, void> {
    return Ref.updateM_(this.ref, f)
  }

  status(s: Status.StatusCode): UIO<void> {
    return Ref.updateM_(this.ref, (res) =>
      I.effectTotal(() => {
        // eslint-disable-next-line functional/immutable-data
        res.statusCode = s.code
        return res
      })
    )
  }

  get headers(): UIO<http.OutgoingHttpHeaders> {
    return I.map_(this.ref.get, (res) => res.getHeaders())
  }

  get(name: string): UIO<O.Option<http.OutgoingHttpHeader>> {
    return I.map_(this.ref.get, (res) => O.fromNullable(res.getHeaders()[name]))
  }

  set(headers: ReadonlyRecord<string, http.OutgoingHttpHeader>): FIO<HttpException, void> {
    return Ref.updateM_(this.ref, (res) =>
      I.deferTotal(() => {
        const hs = Object.entries(headers)
        try {
          for (let i = 0; i < hs.length; i++) {
            res.setHeader(hs[i][0], hs[i][1])
          }
          return I.succeed(res)
        } catch (err) {
          return I.fail(
            new HttpException('Failed to set headers', {
              status: Status.InternalServerError,
              originalError: err
            })
          )
        }
      })
    )
  }

  has(name: string): UIO<boolean> {
    return I.map_(this.ref.get, (res) => res.hasHeader(name))
  }

  write(chunk: string | Buffer): FIO<HttpException, void> {
    return I.bind_(this.ref.get, (res) =>
      I.effectAsync<unknown, HttpException, void>((cb) => {
        res.write(chunk, (err) => {
          if (err) {
            cb(
              I.fail(
                new HttpException('Failed to write body', {
                  status: Status.InternalServerError,
                  originalError: err
                })
              )
            )
          } else {
            cb(I.unit())
          }
        })
      })
    )
  }

  pipeFrom<R, E>(stream: S.Stream<R, E, Byte>): IO<R, HttpException, void> {
    return pipe(
      this.ref.get,
      I.bind((res) =>
        S.run_(
          stream,
          NS.sinkFromWritable(() => res)
        )
      ),
      I.catchAll((e) =>
        I.fail(
          new HttpException('Failed to write response body', {
            status: Status.InternalServerError,
            originalError: e
          })
        )
      )
    )
  }

  end(): UIO<HttpResponseCompleted> {
    return I.bind_(this.ref.get, (res) =>
      I.effectTotal(() => {
        return res.end() as any
      })
    )
  }
}
