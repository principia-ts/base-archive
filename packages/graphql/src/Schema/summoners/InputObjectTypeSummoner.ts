import type { InputRecord } from "../containers";
import type { InferredInputAlgebra, InputPURIS } from "../HKT";
import type { TypeofInputRecord } from "../Utils";
import type { InputValueDefinitionNode } from "graphql";

import { foldLeftWithIndex_ as reduceRecord } from "@principia/base/data/Record";

import {
  createInputObjectTypeDefinitionNode,
  createInputValueDefinitionNode,
  getTypeName
} from "../AST";
import { InputObjectType } from "../containers";

export interface InputObjectTypeSummoner<URI extends string, PURI extends InputPURIS> {
  <Name extends string, Fields extends InputRecord<URI, Fields>>(definition: {
    fields: (F: InferredInputAlgebra<URI, PURI>) => Fields;
    name: Name;
  }): InputObjectType<URI, Name, Fields, TypeofInputRecord<Fields>>;
}

export function makeInputObjectTypeSummoner<URI extends string, PURI extends InputPURIS>() {
  return (interpreters: InferredInputAlgebra<URI, PURI>): InputObjectTypeSummoner<URI, PURI> => (
    definition
  ) => {
    return new InputObjectType(
      definition.name,
      createInputObjectTypeDefinitionNode({
        fields: reduceRecord(
          definition.fields(interpreters),
          [] as InputValueDefinitionNode[],
          (k, acc, v) => {
            return [
              ...acc,
              createInputValueDefinitionNode({
                defaultValue: v.config?.defaultValue,
                description: v.config?.description || v.node.description?.value,
                name: k,
                nonNullable: v.config?.required,
                typeName: getTypeName(v.node)
              })
            ];
          }
        ),
        name: definition.name
      })
    );
  };
}
