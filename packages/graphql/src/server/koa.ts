import type {
  AURItoFieldAlgebra,
  AURItoInputAlgebra,
  ExtendObjectTypeSummoner,
  FieldAURIS,
  InputAURIS,
  InputObjectTypeSummoner,
  ObjectTypeSummoner,
  ScalarTypeSummoner,
  SchemaGenerator,
  SchemaParts
} from '../schema'
import type { Has } from '@principia/base/data/Has'
import type { Config } from 'apollo-server-core'
import type { IResolvers } from 'graphql-tools'
import type { ConnectionContext } from 'subscriptions-transport-ws'
import type WebSocket from 'ws'

import { identity, pipe } from '@principia/base/data/Function'
import { tag } from '@principia/base/data/Has'
import * as I from '@principia/io/IO'
import * as L from '@principia/io/Layer'
import * as Koa from '@principia/koa'
import { ApolloServer } from 'apollo-server-koa'
import { formatError } from 'graphql'
import { makeExecutableSchema } from 'graphql-tools'

import {
  Context,
  makeExtendObjectTypeSummoner,
  makeInputObjectTypeSummoner,
  makeObjectTypeSummoner,
  makeScalarTypeSummoner,
  makeSchemaGenerator
} from '../schema'
import { formatGraphQlException, GraphQlException } from '../schema/GraphQlException'
import { transformResolvers, transformScalarResolvers } from './transform'

export type ApolloKoaConfig = Omit<Config, 'context' | 'schema' | 'subscriptions'> & {
  subscriptions?: Partial<{
    keepAlive?: number
    onConnect?: (connectionParams: unknown, websocket: WebSocket, context: ConnectionContext) => I.IO<any, never, any>
    onDisconnect?: (websocket: WebSocket, context: ConnectionContext) => I.IO<any, never, any>
    path: string
  }>
}

export type SubscriptionsEnv<C extends ApolloKoaConfig> = C extends {
  subscriptions?: Partial<{
    keepAlive?: number
    onConnect?: (
      connectionParams: unknown,
      websocket: WebSocket,
      context: ConnectionContext
    ) => I.IO<infer R, never, any>
    onDisconnect?: (websocket: WebSocket, context: ConnectionContext) => I.IO<infer R1, never, any>
    path: string
  }>
}
  ? (R extends never ? unknown : R) & (R1 extends never ? unknown : R1)
  : unknown

export interface ApolloKoaInstanceConfig<CTX, R> {
  readonly additionalResolvers?: IResolvers
  readonly schemaParts: SchemaParts<CTX, R>
}

export interface ApolloKoaDriver<
  FieldAURI extends FieldAURIS,
  InputAURI extends InputAURIS,
  CTX,
  C extends ApolloKoaConfig,
  RE
> {
  readonly accessContext: I.URIO<Has<Koa.Context<CTX>>, Koa.Context<CTX>>
  readonly extentObject: ExtendObjectTypeSummoner<FieldAURI, InputAURI, Koa.Context<CTX>>
  readonly generateSchema: SchemaGenerator<Koa.Context<CTX>>
  readonly inputObject: InputObjectTypeSummoner<InputAURI>
  readonly object: <ROOT>() => ObjectTypeSummoner<FieldAURI, InputAURI, ROOT, Koa.Context<CTX>>
  readonly scalar: ScalarTypeSummoner
  readonly instance: <R>(
    config: ApolloKoaInstanceConfig<Koa.Context<CTX>, R>
  ) => L.Layer<R & SubscriptionsEnv<C> & RE & Has<Koa.Koa>, never, Has<ApolloKoaServerInstance>>
}

export interface ApolloKoaServerInstance {
  readonly server: ApolloServer
}
export const ApolloKoaServerInstance = tag<ApolloKoaServerInstance>()

type ContextFn<Conf extends ApolloKoaConfig, RE, Ctx> = (_: {
  connection?: Conf['subscriptions'] extends {
    onConnect: (...args: any[]) => I.IO<any, never, infer A>
  }
    ? Omit<Koa.Context['engine']['connection'], 'context'> & {
        context: A
      }
    : Koa.Context['engine']['connection']
  ctx: Koa.Context
}) => I.IO<RE, never, Koa.Context<Ctx>>

export function makeApollo<FieldPURI extends FieldAURIS, InputPURI extends InputAURIS>(
  interpreters: AURItoFieldAlgebra<any, any>[FieldPURI] & AURItoInputAlgebra[InputPURI]
) {
  return <CTX, C extends ApolloKoaConfig, RE>(
    config: C,
    context: ContextFn<C, RE, CTX>
  ): ApolloKoaDriver<FieldPURI, InputPURI, CTX, C, RE> => {
    const accessContext: I.URIO<Has<Koa.Context<CTX>>, Koa.Context<CTX>> = I.asksService(Koa.Context)(identity) as any

    const apolloKoaInstance = <R>(instanceConfig: ApolloKoaInstanceConfig<Koa.Context<CTX>, R>) => {
      const acquire = I.gen(function* (_) {
        const env = yield* _(I.ask<R & SubscriptionsEnv<C> & RE>())

        const [app, httpServer] = yield* _(I.asksServiceM(Koa.Koa)((koa) => I.product_(koa.app, koa.server)))

        const scalars      = transformScalarResolvers(instanceConfig.schemaParts.scalars ?? {}, env)
        const resolvers    = transformResolvers<Koa.Context<CTX>>(instanceConfig.schemaParts.resolvers, env)
        const apolloConfig = { ...config } as Omit<Config, 'context' | 'schema'>
        if (config.subscriptions && config.subscriptions.onConnect) {
          const onConnect    = config.subscriptions.onConnect
          const onDisconnect = config.subscriptions.onDisconnect

          apolloConfig.subscriptions = {
            keepAlive: config.subscriptions.keepAlive,
            onConnect: (connectionParams, websocket, context) =>
              pipe(onConnect(connectionParams, websocket, context), I.give(env), I.runPromise),
            onDisconnect: onDisconnect
              ? (websocket, context) => pipe(onDisconnect(websocket, context), I.give(env), I.runPromise)
              : undefined,
            path: config.subscriptions.path
          }
        }

        const schema = yield* _(
          pipe(
            I.effect(() =>
              makeExecutableSchema({
                resolvers: {
                  ...resolvers,
                  ...(instanceConfig.additionalResolvers ?? {}),
                  ...scalars
                },
                typeDefs: instanceConfig.schemaParts.typeDefs
              })
            ),
            I.orDie
          )
        )

        return yield* _(
          pipe(
            I.effect(() => {
              const server = new ApolloServer({
                context: (ctx) => pipe(context(ctx), I.give(env), I.runPromise),
                schema,
                ...apolloConfig,
                formatError: (error) => {
                  console.log(error)
                  if (apolloConfig.formatError) {
                    return apolloConfig.formatError(error)
                  }
                  return error.originalError instanceof GraphQlException
                    ? formatGraphQlException(error as any)
                    : formatError(error)
                }
              })
              server.applyMiddleware({ app })
              apolloConfig.subscriptions && server.installSubscriptionHandlers(httpServer)
              return server
            }),
            I.orDie
          )
        )
      })

      return L.prepare(ApolloKoaServerInstance)(I.map_(acquire, (server) => ({ server }))).release(({ server }) =>
        pipe(I.fromPromiseDie(server.stop))
      )
    }

    return {
      accessContext,
      extentObject: makeExtendObjectTypeSummoner<FieldPURI, InputPURI, Koa.Context<CTX>>(interpreters),
      generateSchema: makeSchemaGenerator<Koa.Context<CTX>>(),
      inputObject: makeInputObjectTypeSummoner(interpreters),
      instance: apolloKoaInstance,
      object: <ROOT>() => makeObjectTypeSummoner(interpreters)<ROOT, Koa.Context<CTX>>(),
      scalar: makeScalarTypeSummoner
    }
  }
}
