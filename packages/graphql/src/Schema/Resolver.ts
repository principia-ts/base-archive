import type { Has } from "@principia/base/data/Has";
import type * as O from "@principia/base/data/Option";
import type * as U from "@principia/base/util/types";
import type { Context } from "@principia/http";
import type * as I from "@principia/io/IO";

export interface ResolverInput<Root, Args, Ctx> {
  readonly args: Args;
  readonly ctx: Ctx;
  readonly root: O.Option<Root>;
}

export interface SubscriptionResolverInput<Root, Ctx> {
  readonly ctx: Ctx;
  readonly result: Root;
}

export type ResolverF<Root, Args, T, R, E, A> = (
  root: Root,
  args: Args,
  ctx: Context<T>
) => I.IO<R & Has<Context<T>>, E, A>;

export interface SubscriptionResolverF<Root, Args, T, SR, SE, SA, RR, RE, RA> {
  resolve?: (root: Root, ctx: Context<T>) => I.IO<RR & Has<Context<T>>, RE, RA>;
  subscribe: (
    root: Root,
    args: Args,
    ctx: Context<T>
  ) => I.IO<SR & Has<Context<T>>, SE, AsyncIterable<SA>>;
}

export type FieldResolvers<Args, T, K> = {
  [k in keyof K]:
    | ResolverF<any, Args, T, any, any, any>
    | SubscriptionResolverF<any, Args, T, any, any, any, any, any, any>;
};

export type SchemaResolvers<Args, T, N, K> = {
  [k in keyof N]: FieldResolvers<Args, T, K>;
};

export type SchemaResolversEnv<Res, T> = Res extends SchemaResolvers<any, T, any, any>
  ? FieldResolversEnv<U.UnionToIntersection<Res[keyof Res]>, T>
  : never;

export type FieldResolversEnv<Res, T> = Res extends FieldResolvers<any, T, any>
  ? U.UnionToIntersection<
      {
        [k in keyof Res]: Res[k] extends ResolverF<any, any, T, infer R, any, any>
          ? unknown extends R
            ? never
            : R
          : Res[k] extends SubscriptionResolverF<
              any,
              any,
              T,
              infer RS,
              any,
              any,
              infer RR,
              any,
              any
            >
          ? unknown extends RS
            ? unknown extends RR
              ? never
              : RR
            : unknown extends RR
            ? RS
            : RS & RR
          : never;
      }[keyof Res]
    >
  : never;

export type AofResolver<Res> = Res extends ResolverF<any, any, any, any, any, infer A> ? A : never;

export type EofResolver<Res> = Res extends ResolverF<any, any, any, any, infer E, any> ? E : never;

export type RofResolver<Res> = Res extends ResolverF<any, any, any, infer R, any, any> ? R : never;
