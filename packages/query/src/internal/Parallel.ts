import type { DataSource } from '../DataSource'
import type { BlockedRequest } from './BlockedRequest'

import * as A from '@principia/base/Array'
import * as It from '@principia/base/Iterable'
import * as Map from '@principia/base/Map'
import * as O from '@principia/base/Option'

import { eqDataSource } from '../DataSource'
import { Sequential } from './Sequential'

export class Parallel<R> {
  readonly _tag = 'Parallel'

  constructor(private map: ReadonlyMap<DataSource<any, any>, ReadonlyArray<BlockedRequest<any>>>) {}

  ['++']<R1>(that: Parallel<R1>): Parallel<R & R1> {
    return new Parallel(
      It.foldl_(that.map.entries(), this.map, (map, [k, v]) =>
        Map.insertAt_(eqDataSource)(
          map,
          k,
          O.match_(Map.lookupAt_(eqDataSource)(map, k), () => v, A.concat(v))
        )
      )
    )
  }

  get isEmpty() {
    return this.map.size === 0
  }

  get keys(): Iterable<DataSource<R, any>> {
    return this.map.keys()
  }

  get sequential(): Sequential<R> {
    return new Sequential(Map.map_(this.map, (a) => [a]))
  }

  get toIterable(): Iterable<readonly [DataSource<R, any>, ReadonlyArray<BlockedRequest<any>>]> {
    return this.map.entries()
  }
}

export function empty<R>(): Parallel<R> {
  return new Parallel(Map.empty())
}

export function from<R, A>(dataSource: DataSource<R, A>, blockedRequest: BlockedRequest<A>) {
  return new Parallel(Map.insertAt_(eqDataSource)(Map.empty(), dataSource, [blockedRequest]))
}
