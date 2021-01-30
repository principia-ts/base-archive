import type { AnyObjectType } from './Types'
import type { Has } from '@principia/base/Has'
import type * as O from '@principia/base/Option'
import type * as U from '@principia/base/util/types'
import type * as I from '@principia/io/IO'
import type { Stream } from '@principia/io/Stream'
import type * as Q from '@principia/query/Query'
import type { ConnectionContext } from 'subscriptions-transport-ws'

export interface ResolverInput<Root, Args, Ctx> {
  readonly args: Args
  readonly ctx: Ctx
  readonly root: O.Option<Root>
}

export interface SubscriptionResolverInput<Root, Ctx> {
  readonly ctx: Ctx
  readonly result: Root
}

export type Effect<Root, Args, Ctx, R, E, A> = (root: Root, args: Args, ctx: Ctx) => I.IO<R & Has<Ctx>, E, A>

export type Query<Root, Args, Ctx, R, E, A> = (root: Root, args: Args, ctx: Ctx) => Q.Query<R & Has<Ctx>, E, A>

export class Subscription<Root, Args, SR, SE, SA, RR, RE, RA> {
  readonly _tag = 'Subscription'
  constructor(
    readonly subscribe: (root: Root, args: Args, ctx: ConnectionContext) => Stream<SR, SE, SA>,
    readonly resolve: (root: SA, ctx: ConnectionContext) => RA
  ) {}
}

export type Resolver<Root, Args, Ctx, R, E, A> = Effect<Root, Args, Ctx, R, E, A> | Query<Root, Args, Ctx, R, E, A>
export type UntypedResolver = Effect<any, any, any, any, any, any> | Query<any, any, any, any, any, any>

export type TypeResolver<Ctx, A> = (obj: A, ctx: Ctx) => string | null

export type FieldResolvers<Ctx> = Record<
  string,
  Resolver<any, any, Ctx, any, any, any> | Subscription<any, any, any, any, any, any, any, any>
>

export type SchemaResolvers<Ctx> = Record<string, FieldResolvers<Ctx>>

export type SchemaResolversEnv<Res, T> = Res extends SchemaResolvers<T>
  ? FieldResolversEnv<U.UnionToIntersection<Res[keyof Res]>, T>
  : never

export type FieldResolversEnv<Res, T> = Res extends FieldResolvers<T>
  ? U.UnionToIntersection<
      {
        [k in keyof Res]: Res[k] extends Resolver<any, any, T, infer R, any, any>
          ? unknown extends R
            ? never
            : R
          : Res[k] extends Subscription<any, any, infer RS, any, any, infer RR, any, any>
          ? unknown extends RS
            ? unknown extends RR
              ? never
              : RR
            : unknown extends RR
            ? RS
            : RS & RR
          : never
      }[keyof Res]
    >
  : never

export type AofResolver<Res> = Res extends Resolver<any, any, any, any, any, infer A> ? A : never

export type EofResolver<Res> = Res extends Resolver<any, any, any, any, infer E, any> ? E : never

export type RofResolver<Res> = Res extends Resolver<any, any, any, infer R, any, any> ? R : never
