import type { GQLFieldAlgebra } from "../algebras";
import type { InputValueDefinitionNode } from "graphql";

import { foldLeftWithIndex_ as reduceRecord } from "@principia/base/data/Record";

import {
  createInputValueDefinitionNode,
  createUnnamedFieldDefinitionNode,
  getTypeName
} from "../AST";
import { FieldType, ObjectFieldType, RecursiveType, ScalarFieldType } from "../containers";

export const GQLFieldInterpreter = (): GQLFieldAlgebra<any, any, any> => ({
  boolean: (config) =>
    new ScalarFieldType(
      createUnnamedFieldDefinitionNode({
        description: config?.description,
        list: config?.list,
        nonNullable: !config?.nullable,
        typeName: "Boolean"
      }),
      config ?? ({} as any)
    ),
  custom: (type, config) =>
    new ScalarFieldType(
      createUnnamedFieldDefinitionNode({
        description: config?.description,
        list: config?.list,
        nonNullable: !config?.nullable,
        typeName: type().name
      }),
      config ?? ({} as any)
    ),
  field: (definiton) => {
    const { args, resolve, type } = definiton;
    return new FieldType(
      createUnnamedFieldDefinitionNode({
        arguments: reduceRecord(args, [] as InputValueDefinitionNode[], (k, acc, v) => {
          const { config: argConfig } = v;
          return [
            ...acc,
            createInputValueDefinitionNode({
              defaultValue: argConfig?.defaultValue,
              description: argConfig?.description,
              list: argConfig?.list,
              name: k,
              nonNullable: argConfig?.required,
              typeName: getTypeName(v.node)
            })
          ];
        }),
        description: type.config?.description,
        list: type.config?.list,
        nonNullable: !type.config?.nullable,
        typeName: getTypeName(type.node)
      }),
      args,
      resolve,
      (type.config as any) ?? ({} as any)
    );
  },
  float: (config) =>
    new ScalarFieldType(
      createUnnamedFieldDefinitionNode({
        description: config?.description,
        list: config?.list,
        nonNullable: !config?.nullable,
        typeName: "Float"
      }),
      config ?? ({} as any)
    ),
  id: (config) =>
    new ScalarFieldType(
      createUnnamedFieldDefinitionNode({
        description: config?.description,
        list: config?.list,
        nonNullable: !config?.nullable,
        typeName: "ID"
      }),
      config ?? ({} as any)
    ),
  int: (config) =>
    new ScalarFieldType(
      createUnnamedFieldDefinitionNode({
        description: config?.description,
        list: config?.list,
        nonNullable: !config?.nullable,
        typeName: "Int"
      }),
      config ?? ({} as any)
    ),
  objectField: (type, config) =>
    new ObjectFieldType(
      createUnnamedFieldDefinitionNode({
        description: config?.description,
        list: config?.list,
        nonNullable: !config?.nullable,
        typeName: type().name
      }),
      config ?? ({} as any)
    ),
  recursive: () => (name, config) => new RecursiveType(name, config || ({} as any)),
  string: (config) =>
    new ScalarFieldType(
      createUnnamedFieldDefinitionNode({
        description: config?.description,
        list: config?.list,
        nonNullable: !config?.nullable,
        typeName: "String"
      }),
      config ?? ({} as any)
    )
});
