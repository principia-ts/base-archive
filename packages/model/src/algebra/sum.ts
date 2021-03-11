import type { AnyEnv, Config, InterpretedKind, InterpreterURIS, Param } from '../HKT'
import type { Either } from '@principia/base/Either'
import type { Option } from '@principia/base/Option'

export const SumURI = 'model/algebra/sum'

export type SumURI = typeof SumURI

declare module '../HKT' {
  interface URItoAlgebra<IURI, Env> {
    readonly [SumURI]: SumAlgebra<IURI, Env>
  }
}

export type TaggedValues<Tag extends string, O> = {
  [o in keyof O]: O[o] & { [t in Tag]: o }
}

export type TaggedTypes<F extends InterpreterURIS, Env extends AnyEnv, Tag extends string, E, A> = {
  [o in keyof A & keyof E]: InterpretedKind<F, Env, E[o], (A & { [x in o]: { [k in Tag]: o } })[o]>
}

type Infer<
  F extends InterpreterURIS,
  Env extends AnyEnv,
  P extends Param,
  T extends InterpretedKind<F, Env, any, any>
> = T extends InterpretedKind<F, Env, infer E, infer A> ? ('E' extends P ? E : 'A' extends P ? A : never) : never

type DecorateTag<X extends InterpretedKind<any, any, any, any>, Tag extends string, VTag> = X extends InterpretedKind<
  infer F,
  infer Env,
  infer E,
  infer A
>
  ? InterpretedKind<F, Env, E, A & { [k in Tag]: VTag }>
  : never

export interface TaggedUnionConfig<Types> {}
export interface EitherConfig<EE, EA, AE, AA> {}
export interface OptionConfig<E, A> {}

export interface SumAlgebra<F extends InterpreterURIS, Env extends AnyEnv> {
  readonly taggedUnion: <Tag extends string, Types extends TaggedTypes<F, Env, Tag, any, any>>(
    tag: Tag,
    types: Types & { [K in keyof Types]: DecorateTag<Types[K], Tag, K> },
    config?: Config<
      Env,
      Infer<F, Env, 'E', Types[keyof Types]>,
      Infer<F, Env, 'A', Types[keyof Types]>,
      TaggedUnionConfig<Types>
    >
  ) => InterpretedKind<F, Env, Infer<F, Env, 'E', Types[keyof Types]>, Infer<F, Env, 'A', Types[keyof Types]>>
  readonly either: <EE, EA, AE, AA>(
    left: InterpretedKind<F, Env, EE, EA>,
    right: InterpretedKind<F, Env, AE, AA>,
    config?: Config<Env, Either<EE, AE>, Either<EA, AA>, EitherConfig<EE, EA, AE, AA>>
  ) => InterpretedKind<F, Env, Either<EE, AE>, Either<EA, AA>>
  readonly option: <E, A>(
    a: InterpretedKind<F, Env, E, A>,
    config?: Config<Env, Option<E>, Option<A>, OptionConfig<E, A>>
  ) => InterpretedKind<F, Env, Option<E>, Option<A>>
}
