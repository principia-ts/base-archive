import '@principia/base/unsafe/Operators'

import * as A from '@principia/base/Array'
import * as I from '@principia/io/IO'
import * as L from '@principia/io/Layer'
import * as Koa from '@principia/koa'
import { runMain } from '@principia/node/Runtime'
import KoaRouter from 'koa-router'

import { GraphQlFieldInterpreter, GraphQlInputInterpreter } from '../src/schema'
import { GraphQlException } from '../src/schema/GraphQlException'
import { makeApollo } from '../src/server/koa'

const apollo = makeApollo({ ...GraphQlFieldInterpreter(), ...GraphQlInputInterpreter() })({}, ({ ctx }) =>
  I.succeed({
    conn: ctx.conn,
    engine: { ...ctx.engine, custom: 'A custom context thing' }
  })
)

const Obj = apollo.object<{}>()('Obj', (F) => ({
  a: F.string(),
  b: F.float()
}))

const Query = apollo.object<{}>()('Query', (F) => ({
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
    resolve: (r, a, c) => c.conn.request.ip
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

const MoreQueries = apollo.extentObject(
  () => Query,
  (F) => ({
    fac: F.field({
      type: F.int(),
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

const schemaParts = apollo.generateSchema(Query, MoreQueries, Obj)

const program = apollo
  .instance({ schemaParts })
  ['<<<'](Koa.live(4000, 'localhost'))
  ['<<<'](L.succeed(Koa.KoaConfig)({ middleware: [], router: new KoaRouter(), onClose: [] }))

I.never['|>'](I.giveLayer(program))
  ['|>'](I.giveAll({ env: 'This is the environment' }))
  ['|>']((x) => runMain(x))
