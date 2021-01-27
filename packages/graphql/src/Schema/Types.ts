import type { UnnamedFieldDefinitionNode, UnnamedInputValueDefinitionNode } from './AST'
import type { InputTypeConfig, OutputTypeConfig } from './Config'
import type { Resolver } from './Resolver'
import type { ScalarFunctions } from './Scalar'
import type { ReadonlyRecord } from '@principia/base/Record'
import type { Compute } from '@principia/base/util/compute'
import type { ExcludeMatchingProperties } from '@principia/base/util/types'
import type {
  FieldDefinitionNode,
  InputObjectTypeDefinitionNode,
  ObjectTypeDefinitionNode,
  ScalarTypeDefinitionNode
} from 'graphql'

export class GQLField<Root, Args, T, R, E, A> {
  readonly _tag = 'GQLField'

  readonly _R!: (_: R) => void
  readonly _E!: () => E
  readonly _A!: () => A

  constructor(readonly ast: UnnamedFieldDefinitionNode, readonly resolve: Resolver<Root, Args, T, R, E, A>) {}
}

export class GQLScalarField<A> {
  readonly _tag = 'GQLScalarField'
  readonly _A!: () => A
  constructor(readonly ast: UnnamedFieldDefinitionNode, readonly config: OutputTypeConfig) {}
}

export class GQLObjectField<Root, T, R, E, A> {
  readonly _R!: (_: R) => void
  readonly _E!: () => E
  readonly _A!: () => A

  readonly _Root!: Root
  readonly _T!: T

  readonly _tag = 'GQLObjectField'

  constructor(readonly ast: UnnamedFieldDefinitionNode, readonly config: OutputTypeConfig) {}
}

export class GQLObject<N extends string, Root, T, R, E, A> {
  readonly _R!: (_: R) => void
  readonly _E!: () => E
  readonly _A!: () => A

  readonly _T!: T
  readonly _Root!: Root

  readonly _tag = 'GQLObject'

  constructor(
    readonly ast: ObjectTypeDefinitionNode,
    readonly name: N,
    readonly fields: ReadonlyRecord<string, any>,
    readonly resolvers: ReadonlyRecord<string, any>
  ) {}
}

export class GQLExtendObject<O extends GQLObject<any, any, any, any, any, any>, R, E, A> {
  readonly _R!: (_: R) => void
  readonly _E!: () => E
  readonly _A!: () => A

  readonly _tag = 'GQLExtendObject'

  constructor(
    readonly object: O,
    readonly fields: ReadonlyArray<FieldDefinitionNode>,
    readonly resolvers: ReadonlyRecord<string, any>
  ) {}
}

export class GQLInputObject<N extends string, A> {
  readonly _A!: () => A

  readonly _tag = 'GQLInputObject'

  constructor(readonly ast: InputObjectTypeDefinitionNode, readonly name: N) {}
}

export class GQLInputValue<A> {
  readonly _A!: () => A

  readonly _tag = 'GQLInputValue'

  constructor(readonly ast: UnnamedInputValueDefinitionNode, readonly config: InputTypeConfig<A>) {}
}

export class GQLScalar<N extends string, R, I, O> {
  readonly _R!: (_: R) => void

  readonly _tag = 'GQLScalar'

  constructor(readonly ast: ScalarTypeDefinitionNode, readonly name: N, readonly fns: ScalarFunctions<I, O>) {}
}

export type AnyField<T> = GQLScalarField<any> | GQLObjectField<any, T, any, any, any>

export type AnyOutput<T> = AnyField<T> | GQLField<any, any, T, any, any, any>

export type InputRecord<Args> = {
  readonly [K in keyof Args]: GQLInputValue<any>
}

export type FieldRecord<Root, T, F> = Partial<
  {
    [K in keyof Root]: Root[K] extends { [x: string]: any }
      ?
          | GQLObjectField<Root[K], T, any, any, { [K1 in keyof Root[K]]: Root[K][K1] }>
          | GQLField<Root, any, T, any, any, any>
      : Root[K] extends Iterable<any>
      ? GQLScalarField<Root[K]> | GQLField<Root, any, T, any, any, Root[K]>
      : GQLScalarField<Root[K]> | GQLField<Root, any, T, any, any, Root[K]> | GQLObjectField<Root, T, any, any, Root[K]>
  }
> &
  {
    [K in Exclude<keyof F, keyof Root>]:
      | GQLField<Root, any, T, any, any, any>
      | GQLScalarField<any>
      | GQLObjectField<Root, T, any, any, any>
  }

export type FieldResolverRecord<Fs extends FieldRecord<any, any, Fs>> = Compute<
  ExcludeMatchingProperties<
    {
      [K in keyof Fs]: Fs[K] extends GQLField<infer Root, infer Args, infer T, infer R, infer E, infer A>
        ? Resolver<Root, Args, T, R, E, A>
        : never
    },
    never
  >
>

export type AnyRootTypes<T> =
  | GQLInputObject<any, any>
  | GQLObject<any, any, T, any, any, any>
  | GQLExtendObject<any, any, any, any>
  | GQLScalar<any, any, any, any>
