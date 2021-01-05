import type { Method } from './utils'
import type { Byte } from '@principia/base/data/Byte'
import type { Chunk } from '@principia/io/Chunk'
import type { FIO, IO, UIO } from '@principia/io/IO'
import type { URef } from '@principia/io/IORef'
import type * as http from 'http'
import type { Socket } from 'net'

import * as E from '@principia/base/data/Either'
import { flow, pipe } from '@principia/base/data/Function'
import * as Iter from '@principia/base/data/Iterable'
import * as O from '@principia/base/data/Option'
import * as R from '@principia/base/data/Record'
import * as Str from '@principia/base/data/String'
import { makeSemigroup } from '@principia/base/Semigroup'
import * as C from '@principia/io/Chunk'
import * as T from '@principia/io/IO'
import * as Ref from '@principia/io/IORef'
import * as M from '@principia/io/Managed'
import * as Q from '@principia/io/Queue'
import * as S from '@principia/io/Stream'
import * as Pull from '@principia/io/Stream/Pull'
import * as Sy from '@principia/io/Sync'
import * as NS from '@principia/node/stream'
import { TLSSocket } from 'tls'
import * as Url from 'url'

import { HttpException } from './HttpException'
import * as Status from './StatusCode'
import { decodeCharset, parseContentType, SyncDecoderM } from './utils'

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
  readonly _req: URef<http.IncomingMessage>

  private memoizedUrl: URef<E.Either<HttpException, O.Option<Url.URL>>> = Ref.unsafeMake(E.right(O.none()))

  eventStream: M.Managed<unknown, never, T.UIO<S.Stream<unknown, never, RequestEvent>>>

  constructor(req: http.IncomingMessage) {
    this._req = Ref.unsafeMake(req)

    this.eventStream = S.broadcastDynamic_(
      new S.Stream(
        M.gen(function* ($) {
          const queue = yield* $(Q.makeUnbounded<RequestEvent>())
          const done  = yield* $(Ref.make(false))
          yield* $(
            T.total(() => {
              req.on('close', () => {
                T.run(queue.offer({ _tag: 'Close' }))
              })
              req.on('data', (chunk) => {
                T.run(queue.offer({ _tag: 'Data', chunk }))
              })
              req.on('end', () => {
                T.run(queue.offer({ _tag: 'End' }))
              })
              req.on('pause', () => {
                T.run(queue.offer({ _tag: 'Pause' }))
              })
              req.on('error', (error) => {
                T.run(queue.offer({ _tag: 'Error', error }))
              })
              req.on('readable', () => {
                T.run(queue.offer({ _tag: 'Readble' }))
              })
              req.on('resume', () => {
                T.run(queue.offer({ _tag: 'Resume' }))
              })
            })
          )
          return T.flatMap_(done.get, (b) =>
            b
              ? Pull.end
              : T.flatMap_(
                queue.take,
                (event): T.UIO<Chunk<RequestEvent>> => {
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

  access<R, E, A>(f: (req: http.IncomingMessage) => IO<R, E, A>): IO<R, E, A> {
    return T.flatMap_(this._req.get, f)
  }

  get headers(): UIO<http.IncomingHttpHeaders> {
    return T.map_(this._req.get, (req) => req.headers)
  }

  get method(): UIO<Method> {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return T.map_(this._req.get, (req) => req.method!.toUpperCase() as Method)
  }

  get urlString(): UIO<string> {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return T.map_(this._req.get, (req) => req.url!)
  }

  get url(): FIO<HttpException, Url.URL> {
    return T.flatMap_(
      this.memoizedUrl.get,
      E.fold(
        T.fail,
        O.fold(
          () =>
            T.flatMap_(this._req.get, (req) =>
              T.suspend(() => {
                try {
                  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                  const parsedUrl = new Url.URL(req.url!)
                  return T.andThen_(this.memoizedUrl.set(E.right(O.some(parsedUrl))), T.succeed(parsedUrl))
                } catch (err) {
                  const exception = new HttpException(
                    `Error while parsing URL: ${JSON.stringify(err)}`,
                    'HttpRequest#url',
                    { status: Status.BadRequest }
                  )
                  return T.andThen_(this.memoizedUrl.set(E.left(exception)), T.fail(exception))
                }
              })
            ),
          T.succeed
        )
      )
    )
  }

  get query(): FIO<HttpException, R.ReadonlyRecord<string, string>> {
    return pipe(
      this.url,
      T.map((url) =>
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
    return T.map_(this._req.get, (req) => O.fromNullable(req.headers[name]))
  }

  get socket(): UIO<Socket | TLSSocket> {
    return T.map_(this._req.get, (req) => req.socket)
  }

  get protocol(): UIO<string> {
    const self = this
    return T.gen(function* ($) {
      const socket = yield* $(self.socket)
      if (socket instanceof TLSSocket && socket.encrypted) {
        return 'https'
      } else {
        return 'http'
      }
    })
  }

  get secure(): UIO<boolean> {
    return T.map_(this.protocol, (p) => p === 'https')
  }

  get ip(): UIO<string> {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return T.map_(this.socket, (s) => s.remoteAddress!)
  }

  get stream(): S.Stream<unknown, NS.ReadableError, Byte> {
    return S.chain_(S.fromEffect(this._req.get), (req) => NS.streamFromReadable(() => req))
  }

  get rawBody(): FIO<HttpException, string> {
    const self = this
    return T.gen(function* ($) {
      const contentType = yield* $(self.getHeader('Content-Type'))
      const charset     = yield* $(
        pipe(
          contentType,
          O.map(parseContentType),
          O.flatMap((c) => O.fromNullable(c.parameters['charset']?.toLowerCase())),
          decodeCharset.decode(SyncDecoderM),
          Sy.catchAll((_) =>
            Sy.fail(
              new HttpException('Invalid charset', 'HttpRequest#rawBody', { status: Status.UnsupportedMediaType })
            )
          )
        )
      )

      return yield* $(
        pipe(
          self.stream,
          S.runCollect,
          T.map(flow(C.asBuffer, (b) => b.toString(charset))),
          T.catchAll((_) =>
            T.fail(
              new HttpException('Failed to read body stream', 'HttpRequest#rawBody', {
                status: Status.InternalServerError
              })
            )
          )
        )
      )
    })
  }

  get bodyJson(): FIO<HttpException, Record<string, any>> {
    const self = this
    return T.gen(function* ($) {
      const contentType = yield* $(self.getHeader('Content-Type'))
      const charset     = yield* $(
        pipe(
          contentType,
          O.map(parseContentType),
          O.flatMap((c) => O.fromNullable(c.parameters['charset']?.toLowerCase())),
          O.getOrElse(() => 'utf-8'),
          decodeCharset.decode(SyncDecoderM),
          Sy.catchAll((_) =>
            Sy.fail(
              new HttpException('Invalid charset', 'HttpRequest#bodyJson', { status: Status.UnsupportedMediaType })
            )
          )
        )
      )

      if (!Str.startsWith_(charset, 'utf-')) {
        return yield* $(
          T.fail(
            new HttpException('Charset unsupported by JSON', 'HttpRequest#bodyJson', {
              status: Status.UnsupportedMediaType
            })
          )
        )
      }

      return yield* $(
        pipe(
          self.stream,
          S.runCollect,
          T.map(flow(C.asBuffer, (b) => b.toString(charset))),
          T.catchAll((_) =>
            T.fail(
              new HttpException('Failed to read body stream', 'HttpRequest#bodyJson', {
                status: Status.InternalServerError
              })
            )
          ),
          T.flatMap((raw) =>
            T.partial_(
              () => JSON.parse(raw),
              (_) =>
                new HttpException('Failed to parse body JSON', 'HttpRequest#bodyJson', {
                  status: Status.InternalServerError
                })
            )
          )
        )
      )
    })
  }
}
