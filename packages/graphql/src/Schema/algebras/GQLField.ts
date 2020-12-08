import type { EvaluateConfig, OutputTypeConfig } from "../Config";
import type {
  AnyField,
  AnyObjectType,
  AnyScalarType,
  FieldType,
  InputRecord,
  ObjectFieldType,
  RecursiveType,
  RecursiveTypeDef,
  ScalarFieldType
} from "../containers/index";
import type { ResolverF } from "../Resolver";
import type { TypeofInputRecord } from "../Utils";

export const GQLFieldAURI = "graphql-effect/algebras/GQLField" as const;
export type GQLFieldAURI = typeof GQLFieldAURI;

declare module "../HKT" {
  export interface AURItoFieldAlgebra<URI, Root, Ctx> {
    [GQLFieldAURI]: GQLFieldAlgebra<URI, Root, Ctx>;
  }
}

export interface GQLFieldAlgebra<URI extends string, Root, Ctx> {
  boolean: <Config extends OutputTypeConfig>(
    config?: Config
  ) => ScalarFieldType<URI, Config, EvaluateConfig<Config, boolean>>;
  custom: <Type extends AnyScalarType<URI>, Config extends OutputTypeConfig>(
    type: () => Type,
    config?: Config
  ) => ScalarFieldType<URI, Config, EvaluateConfig<Config, Type["_A"]>>;
  field: <Type extends AnyField<URI, Ctx>, Args extends InputRecord<URI, Args>, R, E>(definiton: {
    args: Args;
    resolve: ResolverF<URI, Root, TypeofInputRecord<Args>, Ctx, R, E, Type["_A"]>;
    type: Type;
  }) => FieldType<
    URI,
    NonNullable<Type["config"]>,
    Type,
    Root,
    Args,
    Ctx,
    typeof definiton["resolve"],
    Type["_A"]
  >;
  float: <Config extends OutputTypeConfig>(
    config?: Config
  ) => ScalarFieldType<URI, Config, EvaluateConfig<Config, number>>;
  id: <Config extends OutputTypeConfig>(
    config?: Config
  ) => ScalarFieldType<URI, Config, EvaluateConfig<Config, number>>;
  int: <Config extends OutputTypeConfig>(
    config?: Config
  ) => ScalarFieldType<URI, Config, EvaluateConfig<Config, number>>;
  objectField: <Config extends OutputTypeConfig, Type extends AnyObjectType<URI, Ctx>>(
    type: () => Type,
    config?: Config
  ) => ObjectFieldType<
    URI,
    Config,
    Type["_ROOT"],
    Ctx,
    Type,
    EvaluateConfig<Config, EvaluateConfig<Config, Type["_A"]>>
  >;
  recursive: <Type extends RecursiveTypeDef<any, any>>() => <Config extends OutputTypeConfig>(
    name: Type["_NAME"],
    config?: Config
  ) => RecursiveType<URI, Config, Type, Type["_A"]>;
  string: <Config extends OutputTypeConfig>(
    config?: Config
  ) => ScalarFieldType<URI, Config, EvaluateConfig<Config, string>>;
}
