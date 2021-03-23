import type { Resolver, ScalarFunctions, Subscription } from '../schema'
import type { GraphQLResolveInfo } from 'graphql'
import type { ConnectionContext } from 'subscriptions-transport-ws'

import { asyncIterable } from '@principia/base/AsyncIterable'
import * as E from '@principia/base/Either'
import { identity, pipe } from '@principia/base/function'
import { HttpConnection } from '@principia/http/HttpConnection'
import * as I from '@principia/io/IO'
import { _U } from '@principia/io/IO'
import * as Ref from '@principia/io/IORef'
import * as M from '@principia/io/Managed'
import * as S from '@principia/io/Stream'
import * as Sy from '@principia/io/Sync'
import { Context } from '@principia/koa'
import { Described } from '@principia/query/Described'
import * as Q from '@principia/query/Query'
import { GraphQLScalarType } from 'graphql'

const entries = <A>(_: A): ReadonlyArray<[keyof A, A[keyof A]]> => Object.entries(_) as any
const isIO    = (u: unknown): u is I.IO<any, any, any> =>
  typeof u === 'object' && u != null && _U in u && u[_U] === I.IOURI

export function transformResolvers<Ctx>(
  res: Record<
    string,
    Record<string, Resolver<any, any, Ctx, any, any, any> | Subscription<any, any, any, any, any, any, any, any>>
  >,
  env: any
) {
  const toBind = {}
  for (const [mut_typeName, fields] of entries(res)) {
    const resolvers = {}
    for (const [mut_fieldName, resolver] of entries(fields)) {
      if (typeof resolver === 'function') {
        (resolvers as any)[mut_fieldName] = (root: any, args: any, ctx: any, info: GraphQLResolveInfo) => {
          return I.runPromise(
            I.gen(function* (_) {
              const reqRef  = yield* _(Ref.make(ctx.req))
              const resRef  = yield* _(Ref.makeRefM(ctx.res))
              const context = yield* _(
                I.effectTotal(() => ({
                  engine: ctx,
                  conn: new HttpConnection(reqRef, resRef)
                }))
              )
              const ret     = resolver({
                root,
                args: args || {},
                ctx: context as any,
                info
              })
              if (isIO(ret)) {
                return yield* _(pipe(ret, I.give({ ...(env as any) }), I.giveService(Context)(context)))
              } else {
                return yield* _(
                  pipe(
                    ret,
                    Q.give(Described({ ...(env as any) }, 'Environment given to GraphQl Service')),
                    Q.giveService(Context)(Described(context, 'Context from the Http Server')),
                    Q.run
                  )
                )
              }
            })
          )
        }
      } else {
        (resolvers as any)[mut_fieldName] = {
          subscribe: (root: {}, args: any, ctx: ConnectionContext, info: GraphQLResolveInfo) =>
            I.runPromise(
              I.gen(function* (_) {
                const result = yield* _(
                  pipe(
                    resolver.subscribe({ root, args: args || {}, ctx, info }),
                    S.toAsyncIterable,
                    M.use(I.succeed),
                    I.give({ ...(env as any) })
                  )
                )

                return asyncIterable(async function* () {
                  for await (const r of result) {
                    switch (r._tag) {
                      case 'Left': {
                        throw r.left
                      }
                      case 'Right': {
                        yield r.right
                      }
                    }
                  }
                })
              })
            ),
          resolve: (r: any, ctx: ConnectionContext) =>
            I.runPromise(
              I.gen(function* (_) {
                const result = yield* _(pipe(resolver.resolve({ result: r, ctx }), I.give({ ...(env as any) })))
                yield* _(I.effectTotal(() => console.log(result)))
                return result
              })
            )
        }
      }
    }
    (toBind as any)[mut_typeName] = resolvers
  }
  console.log(toBind)
  return toBind
}

export function transformScalarResolvers(
  scalars: Record<string, { name: string, functions: ScalarFunctions<any, any> }>,
  env: any
) {
  const toBind = {}
  for (const [mut_typeName, resolver] of entries(scalars)) {
    (toBind as any)[mut_typeName] = new GraphQLScalarType({
      name: resolver.name,
      parseLiteral: (u) =>
        pipe(
          resolver.functions.parseLiteral(u),
          Sy.giveAll(env),
          Sy.runEither,
          E.match((e) => {
            throw e
          }, identity)
        ),
      parseValue: (u) =>
        pipe(
          resolver.functions.parseValue(u),
          Sy.giveAll(env),
          Sy.runEither,
          E.match((e) => {
            throw e
          }, identity)
        ),
      serialize: (u) =>
        pipe(
          resolver.functions.serialize(u),
          Sy.giveAll(env),
          Sy.runEither,
          E.match((e) => {
            throw e
          }, identity)
        )
    })
  }
  return toBind
}
