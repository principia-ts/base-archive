import type { FieldRecord, FieldResolverRecord } from "./Utils";
import type { ObjectTypeDefinitionNode } from "graphql";

/**
 * @name ObjectType
 * @description Represents a named output object type, must be added to the schema in order to be used
 */
export class ObjectType<
  URI extends string,
  Name extends string,
  Root,
  Ctx,
  Fields extends FieldRecord<URI, Root, Ctx, Fields>,
  FieldResolvers extends FieldResolverRecord<URI, Fields>,
  R,
  A
> {
  _ROOT!: Root;
  _A!: A;
  _R!: R;
  _F!: Fields;
  _CTX!: Ctx;
  _URI!: URI;
  _C!: { [k in keyof Fields]: Fields[k]["config"] };
  _tag = "ObjectType" as const;
  constructor(
    public name: Name,
    public node: ObjectTypeDefinitionNode,
    public fields: Fields,
    public fieldResolvers: FieldResolvers
  ) {}
}

export type AnyObjectType<URI extends string, Ctx> = ObjectType<
  URI,
  string,
  any,
  Ctx,
  FieldRecord<URI, any, Ctx, any>,
  any,
  any,
  any
>;
