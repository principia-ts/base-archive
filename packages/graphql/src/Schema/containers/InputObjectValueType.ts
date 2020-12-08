import type { UnnamedInputValueDefinitionNode } from "../AST";
import type { InputTypeConfig } from "../Config";
import type { AnyInputObjectType } from "./InputObjectType";

export class InputObjectValueType<
  URI extends string,
  Config extends InputTypeConfig<A>,
  Type extends AnyInputObjectType<URI>,
  A
> {
  _A!: A;
  _T!: Type;
  _URI!: URI;
  _tag = "InputObjectValueType" as const;
  constructor(public node: UnnamedInputValueDefinitionNode, public config: Config) {}
}
