import type { Request } from './Request'

import * as E from '@principia/base/data/Either'
import * as Map from '@principia/base/data/Map'
import * as O from '@principia/base/data/Option'

import { eqRequest } from './Request'

export class CompletedRequestMap {
  constructor(private map: ReadonlyMap<any, E.Either<any, any>>) {}

  concat = (that: CompletedRequestMap) => {
    let copy: ReadonlyMap<any, E.Either<any, any>> = Map.copy(this.map)
    for (const [k, a] of that.map.entries()) {
      copy = Map.insertAt_(eqRequest)(copy, k, a)
    }
    return new CompletedRequestMap(copy)
  }

  insert = <E, A>(request: Request<E, A>, result: E.Either<E, A>): CompletedRequestMap => {
    return new CompletedRequestMap(Map.insertAt_(eqRequest)(this.map, request, result))
  }

  contains = (request: any): boolean => {
    return Map.lookupAt_(eqRequest)(this.map, request)._tag === 'Some'
  }

  insertOption = <E, A>(request: Request<E, A>, result: E.Either<E, O.Option<A>>): CompletedRequestMap => {
    return E.fold_(
      result,
      (e) => this.insert(request, E.left(e)),
      O.fold(
        () => this,
        (a) => this.insert(request, E.right(a))
      )
    )
  }

  lookup = <E, A>(request: Request<E, A>): O.Option<E.Either<E, A>> => {
    return Map.lookupAt_(eqRequest)(this.map, request)
  }

  get requests(): ReadonlySet<Request<any, any>> {
    const r = new Set<Request<any, any>>()
    for (const [k, _] of this.map) {
      r.add(k)
    }
    return r
  }

  static empty(): CompletedRequestMap {
    return new CompletedRequestMap(Map.empty())
  }
}
