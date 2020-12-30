import type { Cache } from '../Cache'

export class QueryContext {
  constructor(readonly cache: Cache) {}
}
