import type { ResolverF, ScalarFunctions } from '../schema'

import * as E from '@principia/base/data/Either'
import { identity, pipe } from '@principia/base/data/Function'
import * as O from '@principia/base/data/Option'
import { Request, Response } from '@principia/http'
import * as T from '@principia/io/IO'
import * as Sy from '@principia/io/Sync'
import { Context } from '@principia/koa'
import { GraphQLScalarType } from 'graphql'

const entries = <A>(_: A): ReadonlyArray<[keyof A, A[keyof A]]> => Object.entries(_) as any

export function transformResolvers<Ctx>(
  res: Record<string, Record<string, ResolverF<any, any, Ctx, any, any, any>>>,
  env: any
) {
  const toBind = {}
  for (const [typeName, fields] of entries(res)) {
    const resolvers = {}
    for (const [fieldName, resolver] of entries(fields)) {
      if (typeof resolver === 'function') {
        (resolvers as any)[fieldName] = (root: any, args: any, ctx: any) => {
          const context = {
            engine: ctx,
            res: new Response(ctx.res),
            req: new Request(ctx.req)
          }
          return pipe(
            (resolver as any)(O.fromNullable(root), args || {}, context),
            T.give({
              ...(env as any)
            }),
            T.giveService(Context)(context),
            T.runPromise
          )
        }
      } else {
        (resolvers as any)[fieldName] = {
          subscribe: (root: any, args: any, ctx: any) => {
            const context = {
              engine: ctx,
              res: new Response(ctx.res),
              req: new Request(ctx.req)
            }
            return pipe(
              (resolver as any).subscribe(O.fromNullable(root), args || {}, context),
              T.give({
                ...(env as any)
              }),
              T.giveService(Context)(context),
              T.runPromise
            )
          }
        }

        if ((resolver as any).resolve) {
          (resolvers as any)[fieldName].resolve = (x: any, _: any, ctx: any) => {
            const context = {
              engine: ctx,
              res: new Response(ctx.res),
              req: new Request(ctx.req)
            }
            return pipe(
              (resolver as any).resolve(x, context),
              T.give({
                ...(env as any)
              }),
              T.giveService(Context)(context),
              T.runPromise
            )
          }
        }
      }
    }
    (toBind as any)[typeName] = resolvers
  }
  return toBind
}

export function transformScalarResolvers(
  scalars: Record<string, { name: string, functions: ScalarFunctions<any, any> }>,
  env: any
) {
  const toBind = {}
  for (const [typeName, resolver] of entries(scalars)) {
    (toBind as any)[typeName] = new GraphQLScalarType({
      name: resolver.name,
      parseLiteral: (u) =>
        pipe(
          resolver.functions.parseLiteral(u),
          Sy.giveAll(env),
          Sy.unsafeRunEither,
          E.fold((e) => {
            throw e
          }, identity)
        ),
      parseValue: (u) =>
        pipe(
          resolver.functions.parseValue(u),
          Sy.giveAll(env),
          Sy.unsafeRunEither,
          E.fold((e) => {
            throw e
          }, identity)
        ),
      serialize: (u) =>
        pipe(
          resolver.functions.serialize(u),
          Sy.giveAll(env),
          Sy.unsafeRunEither,
          E.fold((e) => {
            throw e
          }, identity)
        )
    })
  }
  return toBind
}
