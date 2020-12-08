import { reduceWithIndex_ as reduceRecord } from "@principia/core/Record";
import type { FieldDefinitionNode } from "graphql";

import { addNameToUnnamedFieldDefinitionNode, createFieldDefinitionNode } from "../AST";
import type {
  AnyObjectType,
  AnyOutputFieldType,
  AnyOutputType,
  FieldRecord,
  FieldResolverRecord
} from "../containers";
import { ExtendObjectType } from "../containers";
import type { FieldPURIS, InferredFieldAlgebra } from "../HKT";
import type { TypeofFieldRecord } from "../Utils";

export interface ExtendObjectTypeSummoner<URI extends string, PURI extends FieldPURIS, Ctx> {
  <
    Type extends AnyObjectType<URI, Ctx>,
    Fields extends FieldRecord<URI, Type["_ROOT"], Ctx, Fields>
  >(definition: {
    fields: (F: InferredFieldAlgebra<URI, PURI, Type["_ROOT"], Ctx>) => Fields;
    type: () => Type;
  }): ExtendObjectType<
    URI,
    Type["_ROOT"],
    Ctx,
    Type,
    Fields,
    FieldResolverRecord<URI, Fields>,
    TypeofFieldRecord<Type["fields"] & Fields>
  >;
}

export function makeExtendObjectTypeSummoner<URI extends string, PURI extends FieldPURIS, Ctx>() {
  return (
    interpreters: InferredFieldAlgebra<URI, PURI, any, any>
  ): ExtendObjectTypeSummoner<URI, PURI, Ctx> => (definition) => {
    const fields = definition.fields(interpreters);
    return new ExtendObjectType(
      definition.type(),
      reduceRecord(
        fields,
        [] as FieldDefinitionNode[],
        (k, acc, v: NonNullable<AnyOutputFieldType<URI, Ctx>>) => {
          switch (v._tag) {
            case "RecursiveType":
              return [
                ...acc,
                createFieldDefinitionNode({
                  description: v.config?.description,
                  list: v.config?.list,
                  name: k,
                  nonNullable: !v.config?.nullable,
                  typeName: v.name
                })
              ];
            case "FieldType":
              return [...acc, addNameToUnnamedFieldDefinitionNode(v.node, k)];
            case "ScalarFieldType":
              return [...acc, addNameToUnnamedFieldDefinitionNode(v.node, k)];
            case "ObjectFieldType":
              return [...acc, addNameToUnnamedFieldDefinitionNode(v.node, k)];
          }
        }
      ),
      reduceRecord(fields, {}, (k, acc, v: AnyOutputType<URI, Ctx>) => {
        if (v._tag === "FieldType") {
          return { ...acc, [k]: v.resolve };
        }
        return acc;
      }) as any
    );
  };
}
