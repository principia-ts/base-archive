import type { AURItoFieldAlgebra, AURItoInputAlgebra, FieldAURIS, InputAURIS } from '../HKT'
import type { AnyOutput, FieldRecord } from '../Types'
import type { __A, __E, __R } from '../Utils'
import type { Compute } from '@principia/base/util/compute'
import type { FieldDefinitionNode, ObjectTypeDefinitionNode } from 'graphql'

import * as A from '@principia/base/Array'
import * as R from '@principia/base/Record'

import { addNameToUnnamedFieldDefinitionNode, createObjectTypeDefinitionNode } from '../AST'
import { GQLObject } from '../Types'

export interface ObjectTypeSummoner<FieldAURI extends FieldAURIS, InputAURI extends InputAURIS, Root, T> {
  <Name extends string, Fields extends FieldRecord<Root, T, Fields>>(
    name: Name,
    fields: (F: AURItoFieldAlgebra<Root, T>[FieldAURI] & AURItoInputAlgebra[InputAURI]) => Fields
  ): GQLObject<Name, Root, T, __R<Fields>, __E<Fields>, __A<Fields>>
}

function buildObjectType<FieldAURI extends FieldAURIS, InputAURI extends InputAURIS>(
  name: string,
  fields: (F: AURItoFieldAlgebra<any, any>[FieldAURI] & AURItoInputAlgebra[InputAURI]) => FieldRecord<any, any, any>,
  interpreters: AURItoFieldAlgebra<any, any>[FieldAURI] & AURItoInputAlgebra[InputAURI]
): ObjectTypeDefinitionNode {
  return createObjectTypeDefinitionNode({
    fields: R.foldLeftWithIndex_(
      fields(interpreters) as any,
      [] as ReadonlyArray<FieldDefinitionNode>,
      (b, k, a: NonNullable<AnyOutput<any>>) => {
        switch (a._tag) {
          /*
           * case "RecursiveType":
           *   return A.append_(
           *     b,
           *     createFieldDefinitionNode({
           *       description: a.config?.description,
           *       list: a.config?.list,
           *       name: k,
           *       nullable: a.config?.nullable,
           *       typeName: a.name
           *     })
           *   );
           */
          case 'GQLField':
            return A.append_(b, addNameToUnnamedFieldDefinitionNode(a.ast, k))
          case 'GQLScalarField':
            return A.append_(b, addNameToUnnamedFieldDefinitionNode(a.ast, k))
          case 'GQLObjectField':
            return A.append_(b, addNameToUnnamedFieldDefinitionNode(a.ast, k))
        }
      }
    ),
    name
  })
}

export function makeObjectTypeSummoner<FieldAURI extends FieldAURIS, InputAURI extends InputAURIS>(
  interpreters: AURItoFieldAlgebra<any, any>[FieldAURI] & AURItoInputAlgebra[InputAURI]
) {
  return <Root = {}, T = {}>(): ObjectTypeSummoner<FieldAURI, InputAURI, Root, T> => (name, fields) => {
    const interpretedFields = fields(interpreters)
    return new GQLObject(
      buildObjectType(name, fields, interpreters),
      name,
      interpretedFields,
      R.foldLeftWithIndex_(interpretedFields, {}, (acc, k, v: AnyOutput<T>) => {
        if (v._tag === 'GQLField') {
          return { ...acc, [k]: v.resolve }
        }
        return acc
      })
    )
  }
}
