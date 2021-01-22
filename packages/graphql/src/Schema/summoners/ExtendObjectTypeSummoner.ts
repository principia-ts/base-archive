import type { AURItoFieldAlgebra, AURItoInputAlgebra, FieldAURIS, InputAURIS } from '../HKT'
import type { AnyOutput, FieldRecord, GQLObject } from '../Types'
import type { __A, __E, __R } from '../Utils'
import type { _A, _E, _R, UnionToIntersection } from '@principia/base/util/types'

import * as A from '@principia/base/Array'
import * as R from '@principia/base/Record'

import { addNameToUnnamedFieldDefinitionNode } from '../AST'
import { GQLExtendObject } from '../Types'

export interface ExtendObjectTypeSummoner<FieldAURI extends FieldAURIS, InputAURI extends InputAURIS, T> {
  <Type extends GQLObject<any, any, T, any, any, any>, Fields extends FieldRecord<Type['_Root'], T, Fields>>(
    type: () => Type,
    fields: (F: AURItoFieldAlgebra<Type['_Root'], T>[FieldAURI] & AURItoInputAlgebra[InputAURI]) => Fields
  ): GQLExtendObject<Type, _R<Type> & __R<Fields>, _E<Type> & __E<Fields>, _A<Type> & __A<Fields>>
}

export function makeExtendObjectTypeSummoner<FieldAURI extends FieldAURIS, InputAURI extends InputAURIS, T>(
  interpreters: AURItoFieldAlgebra<any, any>[FieldAURI] & AURItoInputAlgebra[InputAURI]
): ExtendObjectTypeSummoner<FieldAURI, InputAURI, T> {
  return (type, fields) => {
    const interpretedFields = fields(interpreters)
    return new GQLExtendObject(
      type(),
      R.ifoldl_(interpretedFields, A.empty(), (acc, k, v: NonNullable<AnyOutput<T>>) => {
        switch (v._tag) {
          /*
           * case "RecursiveType":
           *   return [
           *     ...acc,
           *     createFieldDefinitionNode({
           *       description: v.config?.description,
           *       list: v.config?.list,
           *       name: k,
           *       nullable: v.config?.nullable,
           *       typeName: v.name
           *     })
           *   ];
           */
          case 'GQLField':
            return [...acc, addNameToUnnamedFieldDefinitionNode(v.ast, k)]
          case 'GQLScalarField':
            return [...acc, addNameToUnnamedFieldDefinitionNode(v.ast, k)]
          case 'GQLObjectField':
            return [...acc, addNameToUnnamedFieldDefinitionNode(v.ast, k)]
        }
      }),
      R.ifoldl_(interpretedFields, {}, (acc, k, v: AnyOutput<T>) => {
        if (v._tag === 'GQLField') {
          return { ...acc, [k]: v.resolve }
        }
        return acc
      }) as any
    )
  }
}
