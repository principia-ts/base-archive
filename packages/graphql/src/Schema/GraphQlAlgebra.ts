import type { EvaluateConfig, InputTypeConfig, OutputTypeConfig } from './Config'
import type { ResolverF } from './Resolver'
import type { AnyField, GQLInputObject, GQLObject, InputRecord } from './Types'
import type { TypeofInputRecord } from './Utils'
import type { _A, _E, _R } from '@principia/base/util/types'

import * as A from '@principia/base/Array'
import * as R from '@principia/base/Record'

import {
  createInputValueDefinitionNode,
  createUnnamedFieldDefinitionNode,
  createUnnamedInputValueDefinitionNode,
  getTypeName
} from './AST'
import { GQLField, GQLInputValue, GQLObjectField, GQLScalarField } from './Types'

export const GraphQlFieldAURI = 'graphql/algebra/field'
export type GraphQlFieldAURI = typeof GraphQlFieldAURI

export const GraphQlInputAURI = 'graphql/algebra/input'
export type GraphQlInputAURI = typeof GraphQlInputAURI

declare module './HKT' {
  interface AURItoFieldAlgebra<Root, T> {
    readonly [GraphQlFieldAURI]: GraphQlFieldAlgebra<Root, T>
  }
  interface AURItoInputAlgebra {
    readonly [GraphQlInputAURI]: GraphQlInputAlgebra
  }
}

export interface GraphQlFieldAlgebra<Root, T> {
  readonly boolean: <C extends OutputTypeConfig>(config?: C) => GQLScalarField<EvaluateConfig<C, boolean>>
  readonly field: <X extends AnyField<T>, Args extends InputRecord<Args>, R, E>(def: {
    type: X
    resolve: ResolverF<Root, TypeofInputRecord<Args>, T, R, E, _A<X>>
    args?: Args
  }) => GQLField<Root, TypeofInputRecord<Args>, T, R, E, _A<X>>
  readonly float: <C extends OutputTypeConfig>(config?: C) => GQLScalarField<EvaluateConfig<C, number>>
  readonly id: <C extends OutputTypeConfig>(config?: C) => GQLScalarField<EvaluateConfig<C, number>>
  readonly int: <C extends OutputTypeConfig>(config?: C) => GQLScalarField<EvaluateConfig<C, number>>
  readonly string: <C extends OutputTypeConfig>(config?: C) => GQLScalarField<EvaluateConfig<C, string>>
  readonly objectField: <C extends OutputTypeConfig, X extends GQLObject<any, any, T, any, any, any>>(
    type: () => X,
    config?: C
  ) => GQLObjectField<X['_Root'], T, _R<X>, _E<X>, EvaluateConfig<C, _A<X>>>
}

export interface GraphQlInputAlgebra {
  readonly booleanArg: <C extends InputTypeConfig<EvaluateConfig<C, boolean>>>(
    config?: C
  ) => GQLInputValue<EvaluateConfig<C, boolean>>
  readonly floatArg: <C extends InputTypeConfig<EvaluateConfig<C, number>>>(
    config?: C
  ) => GQLInputValue<EvaluateConfig<C, number>>
  readonly idArg: <C extends InputTypeConfig<EvaluateConfig<C, string>>>(
    config?: C
  ) => GQLInputValue<EvaluateConfig<C, string>>
  readonly intArg: <C extends InputTypeConfig<EvaluateConfig<C, number>>>(
    config?: C
  ) => GQLInputValue<EvaluateConfig<C, number>>
  readonly objectArg: <X extends GQLInputObject<any, any>, C extends InputTypeConfig<EvaluateConfig<C, _A<X>>>>(
    type: () => X,
    config?: C
  ) => GQLInputValue<EvaluateConfig<C, _A<X>>>
  readonly stringArg: <C extends InputTypeConfig<EvaluateConfig<C, string>>>(
    config?: C
  ) => GQLInputValue<EvaluateConfig<C, string>>
}

export const GraphQlFieldInterpreter = (): GraphQlFieldAlgebra<any, any> => ({
  boolean: (config) =>
    new GQLScalarField(
      createUnnamedFieldDefinitionNode({
        description: config?.description,
        list: config?.list,
        nullable: config?.nullable,
        typeName: 'Boolean'
      }),
      config ?? {}
    ),

  field: ({ args, resolve, type }) =>
    new GQLField(
      createUnnamedFieldDefinitionNode({
        arguments: args
          ? R.foldLeftWithIndex_(args, A.empty(), (b, k, a) => [
              ...b,
              createInputValueDefinitionNode({
                defaultValue: a.config.defaultValue,
                description: a.config.description,
                list: a.config.list,
                name: k,
                nullable: a.config.nullable,
                typeName: getTypeName(a.ast)
              })
            ])
          : [],
        description: type.config.description,
        list: type.config.list,
        nullable: type.config.nullable,
        typeName: getTypeName(type.ast)
      }),
      resolve
    ),

  float: (config) =>
    new GQLScalarField(
      createUnnamedFieldDefinitionNode({
        description: config?.description,
        list: config?.list,
        nullable: config?.nullable,
        typeName: 'Float'
      }),
      config ?? {}
    ),

  id: (config) =>
    new GQLScalarField(
      createUnnamedFieldDefinitionNode({
        description: config?.description,
        list: config?.list,
        nullable: config?.nullable,
        typeName: 'ID'
      }),
      config ?? {}
    ),

  int: (config) =>
    new GQLScalarField(
      createUnnamedFieldDefinitionNode({
        description: config?.description,
        list: config?.list,
        nullable: config?.nullable,
        typeName: 'Int'
      }),
      config ?? {}
    ),

  string: (config) =>
    new GQLScalarField(
      createUnnamedFieldDefinitionNode({
        description: config?.description,
        list: config?.list,
        nullable: config?.nullable,
        typeName: 'String'
      }),
      config ?? {}
    ),

  objectField: (type, config) =>
    new GQLObjectField(
      createUnnamedFieldDefinitionNode({
        description: config?.description,
        list: config?.list,
        nullable: config?.nullable,
        typeName: type().name
      }),
      config ?? {}
    )
})

export const GraphQlInputInterpreter = (): GraphQlInputAlgebra => ({
  booleanArg: (config) =>
    new GQLInputValue(
      createUnnamedInputValueDefinitionNode({
        defaultValue: config?.defaultValue,
        description: config?.description,
        list: config?.list,
        nullable: config?.nullable,
        typeName: 'Boolean'
      }),
      config ?? {}
    ),
  floatArg: (config) =>
    new GQLInputValue(
      createUnnamedInputValueDefinitionNode({
        defaultValue: config?.defaultValue,
        description: config?.description,
        list: config?.list,
        nullable: config?.nullable,
        typeName: 'Float'
      }),
      config ?? ({} as any)
    ),
  idArg: (config) =>
    new GQLInputValue(
      createUnnamedInputValueDefinitionNode({
        defaultValue: config?.defaultValue,
        description: config?.description,
        list: config?.list,
        nullable: config?.nullable,
        typeName: 'ID'
      }),
      config ?? {}
    ),
  intArg: (config) =>
    new GQLInputValue(
      createUnnamedInputValueDefinitionNode({
        defaultValue: config?.defaultValue,
        description: config?.description,
        list: config?.list,
        nullable: config?.nullable,
        typeName: 'Int'
      }),
      config ?? {}
    ),
  objectArg: (type, config) =>
    new GQLInputValue(
      createUnnamedInputValueDefinitionNode({
        defaultValue: config?.defaultValue,
        description: config?.description,
        list: config?.list,
        nullable: config?.nullable,
        typeName: type().name
      }),
      config ?? {}
    ),
  stringArg: (config) =>
    new GQLInputValue(
      createUnnamedInputValueDefinitionNode({
        defaultValue: config?.defaultValue,
        description: config?.description,
        list: config?.list,
        nullable: config?.nullable,
        typeName: 'String'
      }),
      config ?? {}
    )
})
