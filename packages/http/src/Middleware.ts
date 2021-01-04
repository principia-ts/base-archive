import type { HttpConnection } from './HttpConnection'
import type { Has } from '@principia/base/data/Has'
import type * as IO from '@principia/io/IO'

interface HttpResponse {}

export class Middleware<R, E> {
  constructor(readonly fn: (next: IO.UIO<void>) => IO.IO<R & Has<HttpConnection>, E, void>) {}
}
