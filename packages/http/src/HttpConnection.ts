import type { URef } from '@principia/io/IORef'
import type { URefM } from '@principia/io/IORefM'
import type * as http from 'http'

import { tag } from '@principia/base/Has'

import { HttpRequest } from './HttpRequest'
import { HttpResponse } from './HttpResponse'

export class HttpConnection {
  readonly request: HttpRequest
  readonly response: HttpResponse
  constructor(reqRef: URef<http.IncomingMessage>, resRef: URefM<http.ServerResponse>) {
    this.request  = new HttpRequest(reqRef)
    this.response = new HttpResponse(resRef)
  }
}

export const HttpConnectionTag = tag(HttpConnection)
