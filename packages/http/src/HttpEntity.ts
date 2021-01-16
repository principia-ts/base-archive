import type { HttpConnection } from './HttpConnection'
import type { HttpContentType } from './utils'
import type { Byte } from '@principia/base/Byte'
import type { Has } from '@principia/base/Has'
import type { Chunk } from '@principia/io/Chunk'
import type { IO } from '@principia/io/IO'

import * as I from '@principia/io/IO'
import * as S from '@principia/io/Stream'

import { HttpConnectionTag } from './HttpConnection'

export abstract class HttpEntity<R, E, A> {
  readonly _R!: (_: R) => void
  readonly _E!: () => E
  readonly _A!: () => A
  abstract readonly contentType: HttpContentType
  abstract run(): IO<R, E, A>
}

export class Strict extends HttpEntity<unknown, never, Chunk<Byte>> {
  readonly _tag = 'Strict'
  constructor(readonly contentType: HttpContentType, readonly data: Chunk<Byte>) {
    super()
  }
  run() {
    return I.succeed(this.data)
  }
}

export class Stream<R, E, A> extends HttpEntity<R, E, Chunk<A>> {
  readonly _tag = 'Stream'
  constructor(readonly contentType: HttpContentType, readonly stream: S.Stream<R, E, A>) {
    super()
  }
  run() {
    return S.runCollect(this.stream)
  }
}
