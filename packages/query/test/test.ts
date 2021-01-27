import type { Has } from '@principia/base/Has'
import type { Chunk } from '@principia/io/Chunk'
import type { IO } from '@principia/io/IO'

import '@principia/base/unsafe/Operators'

import * as A from '@principia/base/Array'
import * as E from '@principia/base/Either'
import { pipe } from '@principia/base/Function'
import * as O from '@principia/base/Option'
import * as R from '@principia/base/Record'
import * as Show from '@principia/base/Show'
import { matchTag, matchTag_ } from '@principia/base/util/matchers'
import * as C from '@principia/io/Chunk'
import { Console, NodeConsole } from '@principia/io/Console'
import * as I from '@principia/io/IO'
import { inspect } from 'util'

import { CompletedRequestMap } from '../src/CompletedRequestMap'
import * as DS from '../src/DataSource'
import * as Query from '../src/Query'
import { Request } from '../src/Request'

const testData = {
  a: 'A',
  b: 'B',
  c: 'C',
  d: 'D'
}

class Get extends Request<string, string> {
  readonly _tag = 'Get'
  constructor(readonly id: string) {
    super()
  }
  identifier = `Get(${this.id})`
}

class GetAll extends Request<string, Record<string, string>> {
  readonly _tag = 'GetAll'
  constructor() {
    super()
  }
  identifier = 'GetAll'
}

const backendGetAll: I.IO<Has<Console>, never, Record<string, string>> = I.gen(function* (_) {
  const console = yield* _(Console)
  yield* _(console.putStrLn('getAll called'))
  return testData
})

const backendGetSome = (ids: Chunk<string>): I.IO<Has<Console>, never, Record<string, string>> =>
  I.gen(function* (_) {
    const console = yield* _(Console)
    yield* _(console.putStrLn(`getSome ${A.getShow(Show.string).show(A.from(ids))} called`))
    return C.foldl_(ids, {} as Record<string, string>, (r, a) =>
      pipe(
        testData,
        R.lookup(a),
        O.fold(
          () => r,
          (v) => ({ ...r, [a]: v })
        )
      )
    )
  })

type Req = Get | GetAll

const ds = DS.makeBatched(
  'test',
  (requests: Chunk<Req>): IO<Has<Console>, never, CompletedRequestMap> => {
    const [all, one] = C.partition_(requests, (req) => (req._tag === 'GetAll' ? false : true))

    if (C.isNonEmpty(all)) {
      return pipe(
        backendGetAll,
        I.map((allItems) =>
          R.ifoldl_(allItems, CompletedRequestMap.empty(), (result, id, value) =>
            result.insert(new Get(id), E.right(value))
          ).insert(new GetAll(), E.right(allItems))
        )
      )
    } else {
      return I.gen(function* (_) {
        const items = yield* _(
          backendGetSome(C.bind_(one, matchTag({ Get: ({ id }) => C.single(id), GetAll: () => C.empty<string>() })))
        )
        return pipe(
          one,
          C.foldl(CompletedRequestMap.empty(), (result, req) =>
            matchTag_(req, {
              GetAll: () => result,
              Get: (req) =>
                pipe(
                  items,
                  R.lookup(req.id),
                  O.fold(
                    () => result.insert(req, E.left('not found')),
                    (value) => result.insert(req, E.right(value))
                  )
                )
            })
          )
        )
      })
    }
  }
)

const getAll = Query.fromRequest(new GetAll(), ds)

const get = (id: string) => Query.fromRequest(new Get(id), ds)

const program = () => {
  const getSome = Query.foreachPar_(['c', 'd'], get)
  const query   = Query.map2_(getAll, getSome, (_, b) => b)
  return I.gen(function* (_) {
    const console = yield* _(Console)
    const result  = yield* _(Query.run(query))
    yield* _(console.putStrLn(inspect(result)))
  })
}

program()
  ['|>'](I.giveLayer(NodeConsole.live))
  ['|>']((x) => I.run(x, (ex) => console.log(ex)))
