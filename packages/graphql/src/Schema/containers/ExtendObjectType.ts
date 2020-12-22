import type { AnyObjectType } from "./ObjectType";
import type { FieldRecord, FieldResolverRecord } from "./Utils";
import type { FieldDefinitionNode } from "graphql";

/**
 * @name ExtendObjectType
 * @description Represents an extension of an object type
 */

export class ExtendObjectType<
  URI extends string,
  Root extends Type["_ROOT"],
  Ctx,
  Type extends AnyObjectType<URI, Ctx>,
  Fields extends FieldRecord<URI, Type["_ROOT"], Ctx, Fields>,
  FieldResolvers extends FieldResolverRecord<URI, Fields>,
  A
> {
  _A!: A;
  _tag = "ExtendObjectType" as const;
  _ServerURI!: URI;
  _FIELDS!: Fields;
  constructor(
    public type: Type,
    public fields: Array<FieldDefinitionNode>,
    public fieldResolvers: FieldResolvers
  ) {}
}

export type AnyExtendObjectType<ApolloURI extends string, Ctx> = ExtendObjectType<
  ApolloURI,
  any,
  Ctx,
  AnyObjectType<ApolloURI, Ctx>,
  FieldRecord<ApolloURI, any, Ctx, any>,
  FieldResolverRecord<ApolloURI, any>,
  any
>;
