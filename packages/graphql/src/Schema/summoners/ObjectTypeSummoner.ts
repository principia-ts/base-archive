import * as A from "@principia/core/Array";
import { reduceWithIndex_ as reduceRecord } from "@principia/core/Record";
import type { FieldDefinitionNode, ObjectTypeDefinitionNode } from "graphql";

import {
  addNameToUnnamedFieldDefinitionNode,
  createFieldDefinitionNode,
  createObjectTypeDefinitionNode
} from "../AST";
import type { OutputTypeConfig } from "../Config";
import type {
  AnyOutputFieldType,
  AnyOutputType,
  FieldRecord,
  FieldResolverRecord
} from "../containers";
import { ObjectType } from "../containers";
import type { FieldPURIS, InferredFieldAlgebra } from "../HKT";
import type { FieldResolversEnv } from "../Resolver";
import type { TypeofFieldRecord } from "../Utils";

export interface ObjectTypeSummoner<URI extends string, PURI extends FieldPURIS, Root, Ctx> {
  <Name extends string, Fields extends FieldRecord<URI, Root, Ctx, Fields>>(definition: {
    fields: (F: InferredFieldAlgebra<URI, PURI, Root, Ctx>) => Fields;
    name: Name;
  }): ObjectType<
    URI,
    Name,
    Root,
    Ctx,
    Fields,
    FieldResolverRecord<URI, Fields>,
    FieldResolversEnv<URI, FieldResolverRecord<URI, Fields>, Ctx>,
    TypeofFieldRecord<Fields>
  >;
}

function buildObjectType<URI extends string, PURI extends FieldPURIS>(
  definition: {
    config?: OutputTypeConfig;
    fields: (F: InferredFieldAlgebra<URI, PURI, any, any>) => FieldRecord<URI, any, any, any>;
    name: string;
  },
  interpreters: InferredFieldAlgebra<URI, PURI, any, any>
): ObjectTypeDefinitionNode {
  return createObjectTypeDefinitionNode({
    fields: reduceRecord(
      definition.fields(interpreters) as any,
      [] as ReadonlyArray<FieldDefinitionNode>,
      (k, b, a: NonNullable<AnyOutputFieldType<URI, any>>) => {
        switch (a._tag) {
          case "RecursiveType":
            return A.append_(
              b,
              createFieldDefinitionNode({
                description: a.config?.description,
                list: a.config?.list,
                name: k,
                nonNullable: !a.config?.nullable,
                typeName: a.name
              })
            );
          case "FieldType":
            return A.append_(b, addNameToUnnamedFieldDefinitionNode(a.node, k));
          case "ScalarFieldType":
            return A.append_(b, addNameToUnnamedFieldDefinitionNode(a.node, k));
          case "ObjectFieldType":
            return A.append_(b, addNameToUnnamedFieldDefinitionNode(a.node, k));
        }
      }
    ),
    name: definition.name
  });
}

export function makeObjectTypeSummoner<URI extends string, PURI extends FieldPURIS>() {
  return (interpreters: InferredFieldAlgebra<URI, PURI, any, any>) => <
    Root = {},
    Ctx = {}
  >(): ObjectTypeSummoner<URI, PURI, Root, Ctx> => (definition) => {
    const fields = definition.fields(interpreters);
    return new ObjectType(
      definition.name,
      buildObjectType(definition, interpreters),
      fields,
      reduceRecord(fields, {}, (k, acc, v: AnyOutputType<URI, Ctx>) => {
        if (v._tag === "FieldType") {
          return { ...acc, [k]: v.resolve };
        }
        return acc;
      }) as any
    );
  };
}
