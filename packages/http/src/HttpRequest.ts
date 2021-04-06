import type { HttpMethod } from './utils'
import type { Byte } from '@principia/base/Byte'
import type { Chunk } from '@principia/io/Chunk'
import type { FIO, IO, UIO } from '@principia/io/IO'
import type * as http from 'http'
import type { Socket } from 'net'

import * as E from '@principia/base/Either'
import { flow, pipe } from '@principia/base/function'
import * as Iter from '@principia/base/Iterable'
import * as O from '@principia/base/Option'
import * as R from '@principia/base/Record'
import * as Str from '@principia/base/string'
import { makeSemigroup } from '@principia/base/typeclass'
import * as C from '@principia/io/Chunk'
import * as I from '@principia/io/IO'
import * as M from '@principia/io/Managed'
import * as Q from '@principia/io/Queue'
import * as Ref from '@principia/io/Ref'
import * as S from '@principia/io/Stream'
import * as Pull from '@principia/io/Stream/Pull'
import * as Sy from '@principia/io/Sync'
import * as NS from '@principia/node/stream'
import { TLSSocket } from 'tls'
import * as Url from 'url'

import { HttpException } from './HttpException'
import * as Status from './StatusCode'
import { decodeCharset, parseContentType } from './utils'

interface CloseEvent {
  readonly _tag: 'Close'
}

interface DataEvent {
  readonly _tag: 'Data'
  readonly chunk: Buffer
}

interface EndEvent {
  readonly _tag: 'End'
}

interface ErrorEvent {
  readonly _tag: 'Error'
  readonly error: Error
}

interface PauseEvent {
  readonly _tag: 'Pause'
}

interface ReadableEvent {
  readonly _tag: 'Readble'
}

interface ResumeEvent {
  readonly _tag: 'Resume'
}

export type RequestEvent = CloseEvent | DataEvent | EndEvent | ErrorEvent | PauseEvent | ReadableEvent | ResumeEvent

export class HttpRequest {
  private memoizedUrl: E.Either<HttpException, O.Option<Url.URL>> = E.Right(O.None())

  eventStream: M.Managed<unknown, never, I.UIO<S.Stream<unknown, never, RequestEvent>>>

  constructor(readonly ref: Ref.URef<http.IncomingMessage>) {
    this.eventStream = pipe(
      ref.get,
      M.fromEffect,
      M.bind((req) =>
        S.broadcastDynamic_(
          new S.Stream(
            M.gen(function* (_) {
              const queue   = yield* _(Q.makeUnbounded<RequestEvent>())
              const done    = yield* _(Ref.makeRef(false))
              const runtime = yield* _(I.runtime<unknown>())
              yield* _(
                I.effectTotal(() => {
                  req.on('close', () => {
                    runtime.run_(queue.offer({ _tag: 'Close' }))
                  })
                  req.on('data', (chunk) => {
                    runtime.run_(queue.offer({ _tag: 'Data', chunk }))
                  })
                  req.on('end', () => {
                    runtime.run_(queue.offer({ _tag: 'End' }))
                  })
                  req.on('pause', () => {
                    runtime.run_(queue.offer({ _tag: 'Pause' }))
                  })
                  req.on('error', (error) => {
                    runtime.run_(queue.offer({ _tag: 'Error', error }))
                  })
                  req.on('readable', () => {
                    runtime.run_(queue.offer({ _tag: 'Readble' }))
                  })
                  req.on('resume', () => {
                    runtime.run_(queue.offer({ _tag: 'Resume' }))
                  })
                })
              )
              return I.bind_(done.get, (b) =>
                b
                  ? Pull.end
                  : I.bind_(
                      queue.take,
                      (event): I.UIO<Chunk<RequestEvent>> => {
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

  access<R, E, A>(f: (req: http.IncomingMessage) => IO<R, E, A>): IO<R, E, A> {
    return I.bind_(this.ref.get, f)
  }

  get headers(): UIO<http.IncomingHttpHeaders> {
    return I.map_(this.ref.get, (req) => req.headers)
  }

  get method(): UIO<HttpMethod> {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return I.map_(this.ref.get, (req) => req.method!.toUpperCase() as HttpMethod)
  }

  get urlString(): UIO<string> {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return I.map_(this.ref.get, (req) => req.url!)
  }

  get url(): FIO<HttpException, Url.URL> {
    const self = this
    return pipe(
      this.memoizedUrl,
      E.match(
        I.fail,
        O.match(
          () =>
            I.gen(function* (_) {
              const protocol = yield* _(self.protocol)
              const url      = yield* _(self.urlString)
              const host     = yield* _(
                pipe(
                  self.getHeader('host'),
                  I.bind(
                    O.match(
                      () =>
                        I.fail(
                          new HttpException('Defect: request sent without a host', {
                            status: Status.BadRequest
                          })
                        ),
                      I.succeed
                    )
                  )
                )
              )
              return yield* _(
                pipe(
                  I.effect(() => new Url.URL(`${protocol}://${host}${url}`)),
                  I.mapError(
                    (error) =>
                      new HttpException('Error while parsing URL', {
                        status: Status.BadRequest,
                        originalError: error
                      })
                  ),
                  I.tap((url) =>
                    I.effectTotal(() => {
                      // eslint-disable-next-line functional/immutable-data
                      self.memoizedUrl = E.Right(O.Some(url))
                    })
                  ),
                  I.tapError((ex) =>
                    I.effectTotal(() => {
                      // eslint-disable-next-line functional/immutable-data
                      self.memoizedUrl = E.Left(ex)
                    })
                  )
                )
              )
            }),
          I.succeed
        )
      )
    )
  }

  get query(): FIO<HttpException, R.ReadonlyRecord<string, string>> {
    return pipe(
      this.url,
      I.map((url) =>
        R.fromFoldable(
          makeSemigroup((_: string, y: string) => y),
          Iter.Foldable
        )(url.searchParams)
      )
    )
  }

  getHeader(name: 'set-cookie'): UIO<O.Option<ReadonlyArray<string>>>
  getHeader(name: string): UIO<O.Option<string>>
  getHeader(name: string): UIO<O.Option<string | ReadonlyArray<string>>> {
    return pipe(
      this.ref.get,
      I.map((req) => O.fromNullable(req.headers[name]))
    )
  }

  get socket(): UIO<Socket | TLSSocket> {
    return I.map_(this.ref.get, (req) => req.socket)
  }

  get protocol(): UIO<string> {
    const self = this
    return I.gen(function* (_) {
      const socket = yield* _(self.socket)
      if (socket instanceof TLSSocket && socket.encrypted) {
        return 'https'
      } else {
        return 'http'
      }
    })
  }

  get secure(): UIO<boolean> {
    return I.map_(this.protocol, (p) => p === 'https')
  }

  get ip(): UIO<string> {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return I.map_(this.socket, (s) => s.remoteAddress!)
  }

  get stream(): S.Stream<unknown, NS.ReadableError, Byte> {
    return S.bind_(S.fromEffect(this.ref.get), (req) => NS.streamFromReadable(() => req))
  }

  get rawBody(): FIO<HttpException, string> {
    const self = this
    return I.gen(function* (_) {
      const contentType = yield* _(self.getHeader('content-type'))
      const charset     = yield* _(
        pipe(
          contentType,
          O.map(parseContentType),
          O.bind((c) => O.fromNullable(c.parameters['charset']?.toLowerCase())),
          O.getOrElse(() => 'utf-8'),
          decodeCharset.decode,
          Sy.catchAll((_) => Sy.fail(new HttpException('Invalid charset', { status: Status.UnsupportedMediaType })))
        )
      )

      return yield* _(
        pipe(
          self.stream,
          S.runCollect,
          I.map(flow(C.asBuffer, (b) => b.toString(charset))),
          I.catchAll((_) =>
            I.fail(
              new HttpException('Failed to read body stream', {
                status: Status.InternalServerError,
                originalError: _
              })
            )
          )
        )
      )
    })
  }

  get bodyJson(): FIO<HttpException, Record<string, any>> {
    const self = this
    return I.gen(function* (_) {
      const contentType = yield* _(self.getHeader('Content-Type'))
      const charset     = yield* _(
        pipe(
          contentType,
          O.map(parseContentType),
          O.bind((c) => O.fromNullable(c.parameters['charset']?.toLowerCase())),
          O.getOrElse(() => 'utf-8'),
          decodeCharset.decode,
          Sy.catchAll((_) => Sy.fail(new HttpException('Invalid charset', { status: Status.UnsupportedMediaType })))
        )
      )

      if (!Str.startsWith_(charset, 'utf-')) {
        return yield* _(
          I.fail(
            new HttpException('Charset unsupported by JSON', {
              status: Status.UnsupportedMediaType
            })
          )
        )
      }

      return yield* _(
        pipe(
          self.stream,
          S.runCollect,
          I.map(flow(C.asBuffer, (b) => b.toString(charset))),
          I.catchAll((_) =>
            I.fail(
              new HttpException('Failed to read body stream', {
                status: Status.InternalServerError
              })
            )
          ),
          I.bind((raw) =>
            I.effectCatch_(
              () => JSON.parse(raw),
              (_) =>
                new HttpException('Failed to parse body JSON', {
                  status: Status.InternalServerError
                })
            )
          )
        )
      )
    })
  }
}
