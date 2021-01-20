import type { StatusCode } from './StatusCode'

import { Exception } from '@principia/base/Exception'

export interface HttpExceptionData {
  readonly status: StatusCode
  readonly originalError?: unknown
}

export class HttpException extends Exception<HttpExceptionData> {}
