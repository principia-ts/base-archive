import type { UnnamedFieldDefinitionNode } from "../AST";
import type { OutputTypeConfig } from "../Config";

/**
 * @name ScalarFieldType
 * @description Represents a field on an object type with a default resolve function
 */
export class ScalarFieldType<URI extends string, Config extends OutputTypeConfig, A> {
  _A!: A;
  _URI!: URI;
  _tag = "ScalarFieldType" as const;
  constructor(public node: UnnamedFieldDefinitionNode, public config: Config) {}
}

export type AnyScalarFieldType<URI extends string> = ScalarFieldType<URI, OutputTypeConfig, any>;
