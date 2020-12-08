import type { InputObjectTypeDefinitionNode } from "graphql";

import type { InputRecord } from "./Utils";

/**
 * @name InputObjectType
 * @description Represents a named input object type, must be added to the schema in order to be used
 */
export class InputObjectType<
  URI extends string,
  Name extends string,
  Fields extends InputRecord<URI, Fields>,
  A
> {
  _A!: A;
  _F!: Fields;
  _URI!: URI;
  _C!: { [k in keyof Fields]: Fields[k]["config"] };
  _tag = "InputObjectType" as const;
  constructor(public name: Name, public node: InputObjectTypeDefinitionNode) {}
}

export type AnyInputObjectType<ApolloURI extends string> = InputObjectType<
  ApolloURI,
  any,
  InputRecord<ApolloURI, any>,
  any
>;
