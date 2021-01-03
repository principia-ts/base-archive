import type { HttpRequest } from './HttpRequest'
import type { HttpResponse } from './HttpResponse'

import { tag } from '@principia/base/data/Has'

export interface HttpConnection {
  readonly request: HttpRequest
  readonly response: HttpResponse
}

export const HttpConnection = tag<HttpConnection>()
