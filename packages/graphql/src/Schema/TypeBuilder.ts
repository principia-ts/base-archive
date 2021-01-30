import type { GqlSubscription } from './GraphQlAlgebra'
import type { AURItoFieldAlgebra, AURItoInputAlgebra, FieldAURIS, InputAURIS } from './HKT'
import type { TypeResolver } from './Resolver'
import type { _I, _O, ScalarConfig, ScalarFunctions, ScalarParseLiteralF } from './Scalar'
import type { AnyObjectType, AnyOutput, FieldRecord, GQLSubscriptionField, InputRecord } from './Types'
import type { __A, __E, __R } from './Utils'
import type { Compute } from '@principia/base/util/compute'
import type { _A, _E, _R, UnionToIntersection } from '@principia/base/util/types'
import type { FieldDefinitionNode, InputValueDefinitionNode, ValueNode } from 'graphql'

import * as A from '@principia/base/Array'
import { flow, pipe } from '@principia/base/Function'
import * as R from '@principia/base/Record'
import * as DE from '@principia/codec/DecodeErrors'
import * as Sy from '@principia/io/Sync'
import * as M from '@principia/model'
import { valueFromASTUntyped } from 'graphql'

import {
  addNameToUnnamedFieldDefinitionNode,
  createInputObjectTypeDefinitionNode,
  createInputValueDefinitionNode,
  createInterfaceTypeDefinitionNode,
  createNamedTypeNode,
  createObjectFieldNode,
  createObjectTypeDefinitionNode,
  createScalarTypeDefinitionNode,
  createUnionTypeDefinitionNode,
  getTypeName
} from './AST'
import { GraphQlException } from './GraphQlException'
import { GQLExtendObject, GQLInputObject, GQLInterface, GQLObject, GQLScalar, GQLSubscription, GQLUnion } from './Types'

interface ObjectTypeConfig {
  implements?: ReadonlyArray<GQLInterface<any, any, any, any, any>>
}

type BaseQuery = GQLObject<'Query', {}, any, unknown, never, {}>
export const BaseQuery: BaseQuery = new GQLObject('Query', {})

type BaseMutation = GQLObject<'Mutation', {}, any, unknown, never, {}>
export const BaseMutation: BaseMutation = new GQLObject('Mutation', {})

type BaseSubscription = GQLObject<'Subscription', {}, any, unknown, never, {}>
export const BaseSubscription: BaseSubscription = new GQLObject('Subscription', {})

export interface ObjectTypeBuilder<FieldURI extends FieldAURIS, InputURI extends InputAURIS, Root, Ctx> {
  <Name extends string, Fields extends FieldRecord<Root, Ctx, Fields>, C extends ObjectTypeConfig>(
    name: Name,
    fields: (F: AURItoFieldAlgebra<{}, Ctx>[FieldURI] & AURItoInputAlgebra[InputURI]) => Fields,
    config?: C
  ): GQLObject<Name, Root, Ctx, __R<Fields>, __E<Fields>, Compute<Root & __A<Fields>, 'flat'>>
}

export function makeObjectTypeBuilder<FieldURI extends FieldAURIS, InputURI extends InputAURIS>(
  interpreters: AURItoFieldAlgebra<any, any>[FieldURI] & AURItoInputAlgebra[InputURI]
) {
  return <Root, Ctx>(): ObjectTypeBuilder<FieldURI, InputURI, Root, Ctx> => (name, fields, config) => {
    const interpretedFields = fields(interpreters)
    return new GQLObject(name, interpretedFields as any, config?.implements)
  }
}

export interface ExtendObjectTypeBuilder<FieldAURI extends FieldAURIS, InputAURI extends InputAURIS, T> {
  <Type extends GQLObject<any, any, T, any, any, any>, Fields extends FieldRecord<Type['_Root'], T, Fields>>(
    type: () => Type,
    fields: (F: AURItoFieldAlgebra<Type['_Root'], T>[FieldAURI] & AURItoInputAlgebra[InputAURI]) => Fields
  ): GQLExtendObject<Type, _R<Type> & __R<Fields>, _E<Type> & __E<Fields>, _A<Type> & __A<Fields>>
}

export function makeExtendObjectTypeBuilder<FieldAURI extends FieldAURIS, InputAURI extends InputAURIS, T>(
  interpreters: AURItoFieldAlgebra<any, any>[FieldAURI] & AURItoInputAlgebra[InputAURI]
): ExtendObjectTypeBuilder<FieldAURI, InputAURI, T> {
  return (type, fields) => {
    const interpretedFields = fields(interpreters)
    return new GQLExtendObject(type(), interpretedFields)
  }
}

export interface QueryTypeBuilder<FieldURI extends FieldAURIS, InputURI extends InputAURIS, Ctx> {
  <Fields extends FieldRecord<{}, Ctx, Fields>>(
    fields: (F: AURItoFieldAlgebra<{}, Ctx>[FieldURI] & AURItoInputAlgebra[InputURI]) => Fields
  ): GQLExtendObject<BaseQuery, __R<Fields>, __E<Fields>, __A<Fields>>
}

export function makeQueryTypeBuilder<FieldURI extends FieldAURIS, InputURI extends InputAURIS>(
  interpreters: AURItoFieldAlgebra<any, any>[FieldURI] & AURItoInputAlgebra[InputURI]
) {
  return <Ctx>(): QueryTypeBuilder<FieldURI, InputURI, Ctx> => (fields) =>
    makeExtendObjectTypeBuilder(interpreters)(() => BaseQuery, fields as any)
}

export interface MutationTypeBuilder<FieldURI extends FieldAURIS, InputURI extends InputAURIS, Ctx> {
  <Fields extends FieldRecord<{}, Ctx, Fields>>(
    fields: (F: AURItoFieldAlgebra<{}, Ctx>[FieldURI] & AURItoInputAlgebra[InputURI]) => Fields
  ): GQLExtendObject<BaseMutation, __R<Fields>, __E<Fields>, __A<Fields>>
}

export function makeMutationTypeBuilder<FieldURI extends FieldAURIS, InputURI extends InputAURIS>(
  interpreters: AURItoFieldAlgebra<any, any>[FieldURI] & AURItoInputAlgebra[InputURI]
) {
  return <Ctx>(): MutationTypeBuilder<FieldURI, InputURI, Ctx> => (fields) =>
    makeExtendObjectTypeBuilder(interpreters)(() => BaseMutation, fields as any)
}

export interface UnionTypeBuilder<Ctx> {
  <Types extends readonly [AnyObjectType<Ctx>, AnyObjectType<Ctx>, ...ReadonlyArray<AnyObjectType<Ctx>>]>(
    ...types: Types
  ): <N extends string>(
    name: N,
    resolveType: TypeResolver<Ctx, _A<Types[number]>>
  ) => GQLUnion<N, Types, Ctx, _A<Types[number]>>
}

export function makeUnionTypeBuilder<Ctx>(): UnionTypeBuilder<Ctx> {
  return (...types) => (name, resolveType) => new GQLUnion(name, types, resolveType)
}

export interface InterfaceTypeBuilder<FieldURI extends FieldAURIS, InputURI extends InputAURIS, Ctx> {
  <N extends string, Fields extends FieldRecord<{}, Ctx, Fields>>(
    name: N,
    fields: (F: AURItoFieldAlgebra<any, any>[FieldURI] & AURItoInputAlgebra[InputURI]) => Fields,
    resolveType: TypeResolver<Ctx, __A<Fields>>
  ): GQLInterface<N, Ctx, __R<Fields>, __E<Fields>, __A<Fields>>
}

export function makeInterfaceTypeBuilder<FieldURI extends FieldAURIS, InputURI extends InputAURIS>(
  interpreters: AURItoFieldAlgebra<any, any>[FieldURI] & AURItoInputAlgebra[InputURI]
) {
  return <Ctx>(): InterfaceTypeBuilder<FieldURI, InputURI, Ctx> => (name, fields, resolveType) => {
    const interpretedFields = fields(interpreters)
    return new GQLInterface(name, interpretedFields, resolveType)
  }
}

export interface SubscriptionTypeBuilder<FieldURI extends FieldAURIS, InputURI extends InputAURIS, Ctx> {
  <Fields extends FieldRecord<{}, Ctx, Fields>>(
    fields: (F: AURItoFieldAlgebra<{}, Ctx>[FieldURI] & AURItoInputAlgebra[InputURI] & GqlSubscription<Ctx>) => Fields
  ): GQLSubscription<__R<Fields>, __A<Fields>>
}

export function makeSubscriptionTypeBuilder<FieldURI extends FieldAURIS, InputURI extends InputAURIS>(
  interpreters: AURItoFieldAlgebra<any, any>[FieldURI] & AURItoInputAlgebra[InputURI] & GqlSubscription<any>
) {
  return <Ctx>(): SubscriptionTypeBuilder<FieldURI, InputURI, Ctx> => (fields) => {
    const interpretedFields = fields(interpreters)
    return new GQLSubscription(interpretedFields)
  }
}

export interface InputObjectTypeBuilder<InputAURI extends InputAURIS> {
  <Name extends string, Fields extends InputRecord>(
    name: Name,
    fields: (F: AURItoInputAlgebra[InputAURI]) => Fields
  ): GQLInputObject<Name, { [K in keyof Fields]: _A<Fields[K]> }>
}

export function makeInputObjectTypeBuilder<InputAURI extends InputAURIS>(
  interpreters: AURItoInputAlgebra[InputAURI]
): InputObjectTypeBuilder<InputAURI> {
  return (name, fields) => {
    const interpretedFields = fields(interpreters)
    return new GQLInputObject(name, interpretedFields as any)
  }
}

export interface ScalarTypeBuilder {
  <Name extends string, Funcs extends ScalarFunctions<any, any>>(
    name: Name,
    definition: Funcs,
    config?: ScalarConfig
  ): GQLScalar<
    Name,
    UnionToIntersection<
      {
        [K in keyof Funcs]: Funcs[K] extends (...args: any[]) => any
          ? [ReturnType<Funcs[K]>] extends [Sy.Sync<infer R, any, any>]
            ? R
            : unknown
          : unknown
      }[keyof Funcs]
    >,
    _I<Funcs>,
    _O<Funcs>
  >
}

export interface ScalarTypeFromModelBuilder {
  <Name extends string, Config extends ScalarTypeFromCodecConfig<I, O>, I, O>(
    name: Name,
    model: M.M<{}, I, O>,
    config?: Config
  ): GQLScalar<Name, unknown, I, O>
}

export const makeScalarTypeBuilder: ScalarTypeBuilder = (name, definition, config) =>
  new GQLScalar(
    createScalarTypeDefinitionNode({
      description: config?.description,
      directives: config?.directives,
      name
    }),
    name,
    definition
  )

interface ScalarTypeFromCodecConfig<E, A> extends ScalarConfig {
  message?: string
  parseLiteral?: ScalarParseLiteralF<unknown, E>
}

const SyM = DE.getDecodeErrorsValidation({ ...Sy.MonadExcept, ...Sy.Bifunctor })

export const makeScalarTypeFromCodecBuilder: ScalarTypeFromModelBuilder = (name, model, config) => {
  const { decode }   = M.getDecoder(model)
  const { encode }   = M.getEncoder(model)
  const serialize    = (u: unknown) =>
    pipe(
      decode(SyM)(u),
      Sy.mapError(
        (errors) =>
          new GraphQlException(config?.message ?? `Invalid value ${u} provided to Scalar ${name}`, 400, {
            errors: DE.prettyPrint(errors)
          })
      )
    )
  const parseValue   = flow(serialize, Sy.map(encode))
  const parseLiteral = (valueNode: ValueNode) =>
    pipe(
      valueNode,
      valueFromASTUntyped,
      decode(SyM),
      Sy.bimap(
        (errors) =>
          new GraphQlException(
            config?.message ?? `Invalid value ${valueFromASTUntyped(valueNode)} provided to Scalar ${name}`,
            400,
            { errors: DE.prettyPrint(errors) }
          ),
        encode
      )
    )
  return new GQLScalar(
    createScalarTypeDefinitionNode({
      description: config?.description,
      directives: config?.directives,
      name
    }),
    name,
    {
      parseLiteral: config?.parseLiteral ?? (parseLiteral as any),
      parseValue,
      serialize
    }
  )
}
