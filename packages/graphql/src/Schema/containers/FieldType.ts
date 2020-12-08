import type { UnnamedFieldDefinitionNode } from "../AST";
import type { OutputTypeConfig } from "../Config";
import type { EofResolver, ResolverF, RofResolver } from "../Resolver";
import type { TypeofInputRecord } from "../Utils";
import type { AnyField, InputRecord } from "./Utils";

/**
 * @name FieldType
 * @description Represents a field that requires a resolver
 */
export class FieldType<
  URI extends string,
  Config extends OutputTypeConfig,
  Type extends AnyField<URI, Ctx>,
  Root,
  Args extends InputRecord<URI, Args>,
  Ctx,
  Res extends ResolverF<URI, Root, TypeofInputRecord<Args>, Ctx, any, any, A>,
  A
> {
  _A!: A;
  _E!: EofResolver<Res>;
  _R!: RofResolver<Res>;
  _ARGS!: Args;
  _TYPE!: Type;
  _ServerURI!: URI;
  _tag = "FieldType" as const;
  constructor(
    public node: UnnamedFieldDefinitionNode,
    public args: Args,
    public resolve: Res,
    public config: Config
  ) {}
}

export type AnyFieldType<URI extends string, Ctx> = FieldType<
  URI,
  OutputTypeConfig,
  AnyField<URI, Ctx>,
  any,
  InputRecord<URI, any>,
  Ctx,
  any,
  any
>;
