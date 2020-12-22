import type { GQLInputAlgebra } from "../algebras";

import { createUnnamedInputValueDefinitionNode } from "../AST";
import { InputObjectValueType, InputValueType } from "../containers";

export const GQLInputInterpreter = (): GQLInputAlgebra<any> => ({
  booleanArg: (config) =>
    new InputValueType(
      createUnnamedInputValueDefinitionNode({
        defaultValue: config?.defaultValue,
        description: config?.description,
        list: config?.list,
        nonNullable: config?.required ?? true,
        typeName: "Boolean"
      }),
      config ?? ({} as any)
    ),
  customArg: (type, config) =>
    new InputValueType(
      createUnnamedInputValueDefinitionNode({
        defaultValue: config?.defaultValue,
        description: config?.description,
        list: config?.list,
        nonNullable: config?.required ?? true,
        typeName: type().name
      }),
      config ?? ({} as any)
    ),
  floatArg: (config) =>
    new InputValueType(
      createUnnamedInputValueDefinitionNode({
        defaultValue: config?.defaultValue,
        description: config?.description,
        list: config?.list,
        nonNullable: config?.required ?? true,
        typeName: "Float"
      }),
      config ?? ({} as any)
    ),
  idArg: (config) =>
    new InputValueType(
      createUnnamedInputValueDefinitionNode({
        defaultValue: config?.defaultValue,
        description: config?.description,
        list: config?.list,
        nonNullable: config?.required ?? true,
        typeName: "ID"
      }),
      config ?? ({} as any)
    ),
  intArg: (config) =>
    new InputValueType(
      createUnnamedInputValueDefinitionNode({
        defaultValue: config?.defaultValue,
        description: config?.description,
        list: config?.list,
        nonNullable: config?.required ?? true,
        typeName: "Int"
      }),
      config ?? ({} as any)
    ),
  objectArg: (type, config) =>
    new InputObjectValueType(
      createUnnamedInputValueDefinitionNode({
        defaultValue: config?.defaultValue,
        description: config?.description,
        list: config?.list,
        nonNullable: config?.required ?? true,
        typeName: type().name
      }),
      config ?? ({} as any)
    ),
  stringArg: (config) =>
    new InputValueType(
      createUnnamedInputValueDefinitionNode({
        defaultValue: config?.defaultValue,
        description: config?.description,
        list: config?.list,
        nonNullable: config?.required ?? true,
        typeName: "String"
      }),
      config ?? ({} as any)
    )
});
