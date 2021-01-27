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
import * as L from '@principia/io/Layer'
import * as Koa from '@principia/koa'
import { runMain } from '@principia/node/Runtime'
import { CompletedRequestMap } from '@principia/query/CompletedRequestMap'
import * as DS from '@principia/query/DataSource'
import * as Q from '@principia/query/Query'
import { Request } from '@principia/query/Request'
import KoaRouter from 'koa-router'

import { DefaultGraphQlInterpreters } from '../src/schema'
import { GraphQlException } from '../src/schema/GraphQlException'
import { makeGql } from '../src/server/koa'

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

class GetAll extends Request<string, typeof testData> {
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

const getAll = Q.fromRequest(new GetAll(), ds)

const get = (id: string) => Q.fromRequest(new Get(id), ds)

const apollo = makeGql(DefaultGraphQlInterpreters)({}, ({ ctx }) => I.succeed(ctx))

const Obj = apollo.makeObject<{}>()('Obj', (F) => ({
  a: F.string(),
  b: F.float()
}))

const Obj2 = apollo.makeObject<{}>()('Obj2', (F) => ({
  a: F.string(),
  b: F.string(),
  c: F.string(),
  d: F.string()
}))

const Query = apollo.makeObject<{}>()('Query', (F) => ({
  hello: F.field({
    type: F.string(),
    args: { name: F.stringArg() },
    resolve: (_root, { name }, _ctx) => I.succeed(`Hello, ${name}`)
  }),
  obj: F.field({
    type: F.objectField(() => Obj),
    resolve: () => I.succeed({ a: 'hello', b: 42 })
  }),
  custom: F.field({
    type: F.string(),
    resolve: (r, a, c) => c.conn.req.ip
  }),
  getAll: F.field({
    type: F.objectField(() => Obj2),
    resolve: () => getAll
  })
}))

const fac = (n: number): I.UIO<number> =>
  I.gen(function* (_) {
    if (n === 0) {
      return 1
    } else {
      return n * (yield* _(fac(n - 1)))
    }
  })

const MoreQueries = apollo.makeExtentObject(
  () => Query,
  (F) => ({
    fac: F.field({
      type: F.float(),
      args: { n: F.intArg() },
      resolve: (_r, { n }, _c) => fac(n)
    }),
    sum: F.field({
      type: F.float(),
      args: { ns: F.floatArg({ list: true }) },
      resolve: (_, { ns }, _c) => I.succeed(A.sum(ns))
    }),
    env: F.field({
      type: F.string(),
      resolve: () => I.asks((_: { env: string }) => _.env)
    }),
    error: F.field({
      type: F.string(),
      resolve: () =>
        I.fail(
          new GraphQlException('A test exception', 500, {
            someData: 'this is some additional data'
          })
        )
    })
  })
)

const schemaParts = apollo.makeSchema(Query, MoreQueries, Obj, Obj2)

const program = apollo.getInstance({ schemaParts })['<<<'](Koa.live(4000, 'localhost'))['<<<'](Koa.KoaConfig.live)

I.never['|>'](I.giveLayer(program))
  ['|>'](I.giveLayer(NodeConsole.live))
  ['|>'](I.giveAll({ env: 'This is the environment' }))
  ['|>']((x) => runMain(x))
