import type { HttpContentType } from './utils'
import type { Byte } from '@principia/base/Byte'
import type { IO } from '@principia/io/IO'

import * as I from '@principia/io/IO'
import * as S from '@principia/io/Stream'

export abstract class HttpEntity<R, E, A> {
  readonly _R!: (_: R) => void
  readonly _E!: () => E
  readonly _A!: () => A
  abstract readonly contentType: HttpContentType
  abstract run(): IO<R, E, A>
}

export class Strict extends HttpEntity<unknown, never, ReadonlyArray<Byte>> {
  readonly _tag = 'Strict'
  constructor(readonly contentType: HttpContentType, readonly data: ReadonlyArray<Byte>) {
    super()
  }
  run() {
    return I.succeed(this.data)
  }
}

export class Stream<R, E, A> extends HttpEntity<R, E, ReadonlyArray<A>> {
  readonly _tag = 'Stream'
  constructor(readonly contentType: HttpContentType, readonly stream: S.Stream<R, E, A>) {
    super()
  }
  run() {
    return S.runCollect(this.stream)
  }
}
