/* eslint-disable functional/immutable-data */
import type { Resolver, TypeResolver, UntypedResolver } from './Resolver'
import type { ScalarFunctions } from './Scalar'
import type {
  AnyRootType,
  GQLExtendObject,
  GQLInputObject,
  GQLInterface,
  GQLObject,
  GQLScalar,
  GQLSubscription,
  GQLSubscriptionField,
  GQLUnion
} from './Types'
import type { UnionToIntersection } from '@principia/base/util/types'
import type {
  DocumentNode,
  FieldDefinitionNode,
  GraphQLResolveInfo,
  InputObjectTypeDefinitionNode,
  InterfaceTypeDefinitionNode,
  ObjectTypeDefinitionNode,
  ScalarTypeDefinitionNode,
  UnionTypeDefinitionNode
} from 'graphql'

import * as A from '@principia/base/Array'
import * as R from '@principia/base/Record'
import { inspect } from 'util'

import { createDocumentNode, createObjectTypeDefinitionNode, createSchemaDefinitionNode } from './AST'
import { BaseMutation, BaseQuery, BaseSubscription } from './SchemaBuilder'

export class SchemaParts<Ctx, R> {
  readonly _R!: (_: R) => void
  constructor(
    readonly typeDefs: DocumentNode,
    readonly resolvers: Record<string, Record<string, UntypedResolver>>,
    readonly scalars: Record<string, { name: string, functions: ScalarFunctions<any, any> }>,
    readonly typeResolvers: Record<string, { __resolveType: TypeResolver<any, any> }>
  ) {}
}

type ExtractEnv<Fragments extends ReadonlyArray<AnyRootType<any>>> = UnionToIntersection<
  {
    [K in number]: [Fragments[K]] extends [{ _R: (_: infer R) => void }] ? R : unknown
  }[number]
>

export interface SchemaGenerator<Ctx> {
  <Fragments extends ReadonlyArray<AnyRootType<any>>>(...fragments: Fragments): SchemaParts<Ctx, ExtractEnv<Fragments>>
}

export const makeSchemaGenerator = <Ctx>(): SchemaGenerator<Ctx> => (...fragments) => {
  const objectTypes: Record<string, GQLObject<any, any, any, any, any, any>>  = {
    Query: BaseQuery,
    Mutation: BaseMutation
  }
  const extendTypes: Record<string, GQLExtendObject<any, any, any, any>>      = {}
  const inputObjectTypes: Record<string, GQLInputObject<any, any>>            = {}
  const scalarTypes: Record<string, GQLScalar<any, any, any, any>>            = {}
  const unionTypes: Record<string, GQLUnion<any, any, any, any>>              = {}
  const interfaceTypes: Record<string, GQLInterface<any, any, any, any, any>> = {}
  const subscriptions: Array<GQLSubscription<any, any>>                       = []

  for (const type of fragments) {
    switch (type._tag) {
      case 'GQLExtendObject': {
        extendTypes[type.object.name] = type as any
        break
      }
      case 'GQLObject': {
        objectTypes[type.name] = type as any
        break
      }
      case 'GQLInputObject': {
        inputObjectTypes[type.name] = type as any
        break
      }
      case 'GQLSubscription': {
        subscriptions.push(type)
        break
      }
      case 'GQLScalar': {
        scalarTypes[type.name] = type as any
        break
      }
      case 'GQLUnion': {
        unionTypes[type.name] = type as any
        break
      }
      case 'GQLInterface': {
        interfaceTypes[type.name] = type as any
        break
      }
    }
  }
  const resolvers: any = {}
  for (const [k, v] of Object.entries(objectTypes)) {
    resolvers[k] = v.resolvers
  }
  for (const [k, v] of Object.entries(extendTypes)) {
    if (resolvers[k]) {
      resolvers[k] = { ...resolvers[k], ...v.resolvers }
    } else {
      resolvers[k] = v.resolvers
    }
  }
  for (const [k, v] of Object.entries(interfaceTypes)) {
    resolvers[k] = v.resolvers
  }

  const subscriptionResolvers = A.foldl_(subscriptions, {}, (b, a) => ({ ...b, ...a.resolvers }))
  if (Object.keys(subscriptionResolvers).length !== 0) {
    resolvers['Subscription'] = subscriptionResolvers
  }

  const typeResolvers: any = {}
  for (const [k, v] of Object.entries(unionTypes)) {
    typeResolvers[k] = {
      __resolveType: (obj: any, ctx: any, info: GraphQLResolveInfo) => v.resolveType({ obj, ctx, info })
    }
  }
  for (const [k, v] of Object.entries(interfaceTypes)) {
    typeResolvers[k] = {
      __resolveType: v.resolveType
    }
  }

  const scalars: any = {}
  for (const [k, v] of Object.entries(scalarTypes)) {
    scalars[k] = {
      functions: v.fns,
      name: v.name
    }
  }
  const extendFieldAST    = R.ifoldl_(
    extendTypes,
    {} as Record<string, ReadonlyArray<FieldDefinitionNode>>,
    (b, k, v) => ({
      ...b,
      [k]: v.ast
    })
  )
  const extendObjectNames = R.ifoldl_(extendTypes, [] as string[], (acc, k, _v) => [...acc, k])
  const objectAST         = R.ifoldl_(objectTypes, [] as ObjectTypeDefinitionNode[], (b, k, v) => {
    return extendObjectNames.includes(k)
      ? [...b, { ...v.ast, fields: [...(v.ast.fields || []), ...extendFieldAST[k]] }]
      : [...b, v.ast]
  })
  const inputAST          = R.foldl_(inputObjectTypes, [] as InputObjectTypeDefinitionNode[], (acc, v) => [...acc, v.ast])
  const scalarAST         = R.foldl_(scalarTypes, [] as ScalarTypeDefinitionNode[], (acc, v) => [...acc, v.ast])
  const unionAST          = R.foldl_(unionTypes, [] as UnionTypeDefinitionNode[], (acc, v) => [...acc, v.ast])
  const interfaceAST      = R.foldl_(interfaceTypes, [] as InterfaceTypeDefinitionNode[], (acc, v) => [...acc, v.ast])
  const subscriptionAST   = createObjectTypeDefinitionNode({
    name: 'Subscription',
    fields: A.foldl_(subscriptions, [] as FieldDefinitionNode[], (acc, v) => [...acc, ...v.ast])
  })

  const schemaDefinitionNode = createSchemaDefinitionNode({
    mutation: Object.keys(resolvers).includes('Mutation'),
    query: Object.keys(resolvers).includes('Query'),
    subscription: Object.keys(resolvers).includes('Subscription')
  })

  const typeDefs = createDocumentNode([
    ...objectAST,
    ...inputAST,
    ...scalarAST,
    ...unionAST,
    ...interfaceAST,
    ...(subscriptionAST.fields?.length === 0 ? [] : [subscriptionAST]),
    schemaDefinitionNode
  ])
  return new SchemaParts(typeDefs, resolvers, scalars, typeResolvers)
}
