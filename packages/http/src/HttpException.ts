import type { StatusCode } from './StatusCode'

import { Exception } from '@principia/base/data/Exception'

export interface HttpExceptionData {
  readonly status: StatusCode
  readonly originalError?: unknown
}

export class HttpException extends Exception<string, HttpExceptionData> {}
