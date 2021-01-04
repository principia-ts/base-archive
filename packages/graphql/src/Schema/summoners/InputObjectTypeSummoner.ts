import type { AURItoInputAlgebra, InputAURIS } from '../HKT'
import type { InputRecord } from '../Types'
import type { _A } from '@principia/base/util/types'
import type { InputValueDefinitionNode } from 'graphql'

import * as R from '@principia/base/data/Record'

import { createInputObjectTypeDefinitionNode, createInputValueDefinitionNode, getTypeName } from '../AST'
import { GQLInputObject } from '../Types'

export interface InputObjectTypeSummoner<InputAURI extends InputAURIS> {
  <Name extends string, Fields extends InputRecord<Fields>>(
    name: Name,
    fields: (F: AURItoInputAlgebra[InputAURI]) => Fields
  ): GQLInputObject<Name, { [K in keyof Fields]: _A<Fields[K]> }>
}

export function makeInputObjectTypeSummoner<InputAURI extends InputAURIS>(
  interpreters: AURItoInputAlgebra[InputAURI]
): InputObjectTypeSummoner<InputAURI> {
  return (name, fields) =>
    new GQLInputObject(
      createInputObjectTypeDefinitionNode({
        fields: R.foldLeftWithIndex_(fields(interpreters), [] as InputValueDefinitionNode[], (acc, k, v) => {
          return [
            ...acc,
            createInputValueDefinitionNode({
              defaultValue: v.config?.defaultValue,
              description: v.config?.description || v.ast.description?.value,
              name: k,
              nullable: v.config.nullable,
              typeName: getTypeName(v.ast)
            })
          ]
        }),
        name
      }),
      name
    )
}
