import type { Method } from './utils'
import type { HttpConnection } from './HttpConnection'
import type { HttpException } from './HttpException'
import type { IO } from '@principia/io/IO'

import * as I from '@principia/io/IO'
import { pathToRegexp } from 'path-to-regexp'

export type MatchMethod = Method | '*'

export class RouteMatcher {
  readonly regex: RegExp
  constructor(readonly method: MatchMethod, readonly path: string) {
    this.regex = pathToRegexp(path)
  }
  match(conn: HttpConnection): IO<unknown, HttpException, boolean> {
    const self = this
    return I.gen(function* (_) {
      const { pathname } = yield* _(conn.request.url)
      const method       = yield* _(conn.request.method)
      return self.method === '*' || self.method === method ? self.regex.test(pathname) : false
    })
  }
}
