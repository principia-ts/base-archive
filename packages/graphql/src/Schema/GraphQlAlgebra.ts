import type { EvaluateConfig, InputTypeConfig, OutputTypeConfig } from './Config'
import type { Resolver, Subscription } from './Resolver'
import type { AnyField, GQLInputObject, GQLObject, GQLScalar, GQLUnion, InputRecord } from './Types'
import type { TypeofInputRecord } from './Utils'
import type { Integer } from '@principia/base/Integer'
import type { _A, _E, _R } from '@principia/base/util/types'

import { memoize } from '@principia/model/utils'

import { GQLField, GQLInputField, GQLObjectField, GQLScalarField, GQLSubscriptionField, GQLUnionField } from './Types'

export const GqlFieldURI = 'graphql/algebra/field'
export type GqlFieldURI = typeof GqlFieldURI

export const GqlInputURI = 'graphql/algebra/input'
export type GqlInputURI = typeof GqlInputURI

declare module './HKT' {
  interface AURItoFieldAlgebra<Root, Ctx> {
    readonly [GqlFieldURI]: GqlField<Root, Ctx>
  }
  interface AURItoInputAlgebra {
    readonly [GqlInputURI]: GqlInput
  }
}

export interface GqlField<Root, Ctx> {
  readonly boolean: <C extends OutputTypeConfig>(config?: C) => GQLScalarField<EvaluateConfig<C, boolean>>
  readonly field: <X extends AnyField<Ctx>, Args extends InputRecord, R, E>(def: {
    type: X
    resolve: Resolver<Root, TypeofInputRecord<Args>, Ctx, R, E, _A<X>>
    args?: Args
  }) => GQLField<Root, TypeofInputRecord<Args>, Ctx, R, E, _A<X>>
  readonly float: <C extends OutputTypeConfig>(config?: C) => GQLScalarField<EvaluateConfig<C, number>>
  readonly id: <C extends OutputTypeConfig>(config?: C) => GQLScalarField<EvaluateConfig<C, number>>
  readonly int: <C extends OutputTypeConfig>(config?: C) => GQLScalarField<EvaluateConfig<C, Integer>>
  readonly string: <C extends OutputTypeConfig>(config?: C) => GQLScalarField<EvaluateConfig<C, string>>
  readonly union: <X extends GQLUnion<any, any, Ctx, any>, C extends OutputTypeConfig>(
    type: () => X,
    config?: C
  ) => GQLUnionField<Ctx, EvaluateConfig<C, _A<X>>>
  readonly object: <C extends OutputTypeConfig, X extends GQLObject<any, any, Ctx, any, any, any>>(
    type: () => X,
    config?: C
  ) => GQLObjectField<X['_Root'], Ctx, _R<X>, _E<X>, EvaluateConfig<C, _A<X>>>
  readonly scalar: <X extends GQLScalar<any, any, any, any>, C extends OutputTypeConfig>(
    scalar: () => X,
    config?: C
  ) => GQLScalarField<EvaluateConfig<C, _A<X>>>
}

export interface GqlInput {
  readonly booleanArg: <C extends InputTypeConfig<EvaluateConfig<C, boolean>>>(
    config?: C
  ) => GQLInputField<EvaluateConfig<C, boolean>>
  readonly floatArg: <C extends InputTypeConfig<EvaluateConfig<C, number>>>(
    config?: C
  ) => GQLInputField<EvaluateConfig<C, number>>
  readonly idArg: <C extends InputTypeConfig<EvaluateConfig<C, string>>>(
    config?: C
  ) => GQLInputField<EvaluateConfig<C, string>>
  readonly intArg: <C extends InputTypeConfig<EvaluateConfig<C, number>>>(
    config?: C
  ) => GQLInputField<EvaluateConfig<C, number>>
  readonly objectArg: <X extends GQLInputObject<any, any>, C extends InputTypeConfig<EvaluateConfig<C, _A<X>>>>(
    type: () => X,
    config?: C
  ) => GQLInputField<EvaluateConfig<C, _A<X>>>
  readonly stringArg: <C extends InputTypeConfig<EvaluateConfig<C, string>>>(
    config?: C
  ) => GQLInputField<EvaluateConfig<C, string>>
  readonly scalarArg: <X extends GQLScalar<any, any, any, any>, C extends InputTypeConfig<EvaluateConfig<C, _A<X>>>>(
    scalar: () => X,
    config?: C
  ) => GQLInputField<EvaluateConfig<C, _A<X>>>
}

export interface GqlSubscription<Ctx> {
  readonly subscription: <X extends AnyField<Ctx>, Args extends InputRecord, SR, SE, SA, RR, RE>(def: {
    type: X
    resolve: Subscription<{}, TypeofInputRecord<Args>, SR, SE, SA, RR, RE, _A<X>>
    args?: Args
  }) => GQLSubscriptionField<SR & RR, _A<X>>
}

export const GqlSubscriptionInterpreter = memoize<void, GqlSubscription<any>>(() => ({
  subscription: ({ args, type, resolve }) => new GQLSubscriptionField(type, args, resolve)
}))

export const GqlFieldInterpreter = memoize<void, GqlField<any, any>>(
  (): GqlField<any, any> => ({
    boolean: (config) => new GQLScalarField('Boolean', config),
    field: ({ args, resolve, type }) => new GQLField(type, args, resolve),
    union: (type, config) => new GQLUnionField(type().name, config),
    float: (config) => new GQLScalarField('Float', config),
    id: (config) => new GQLScalarField('ID', config),
    int: (config) => new GQLScalarField('Int', config),
    string: (config) => new GQLScalarField('String', config),
    object: (type, config) => new GQLObjectField(type().name, config),
    scalar: (scalar, config) => new GQLScalarField(scalar().name, config)
  })
)

export const GqlInputInterpreter = memoize<void, GqlInput>(
  (): GqlInput => ({
    booleanArg: (config) => new GQLInputField('Boolean', config),
    floatArg: (config) => new GQLInputField('Float', config),
    idArg: (config) => new GQLInputField('ID', config),
    intArg: (config) => new GQLInputField('Int', config),
    objectArg: (type, config) => new GQLInputField(type().name, config),
    stringArg: (config) => new GQLInputField('String', config),
    scalarArg: (scalar, config) => new GQLInputField(scalar().name, config)
  })
)

export const DefaultGraphQlInterpreters = {
  ...GqlFieldInterpreter(),
  ...GqlInputInterpreter(),
  ...GqlSubscriptionInterpreter()
}
