import type { EvaluateConfig, InputTypeConfig } from "../Config";
import type {
  AnyInputObjectType,
  AnyScalarType,
  InputObjectValueType,
  InputValueType
} from "../containers";

export const GQLInputAURI = "graphql-effect/algebras/GQLInput" as const;
export type GQLInputAURI = typeof GQLInputAURI;

declare module "../HKT" {
  export interface AURItoInputAlgebra<URI> {
    [GQLInputAURI]: GQLInputAlgebra<URI>;
  }
  export interface AURItoFieldAlgebra<URI, Root, Ctx> {
    [GQLInputAURI]: GQLInputAlgebra<URI>;
  }
}

export interface GQLInputAlgebra<URI extends string> {
  booleanArg: <Config extends InputTypeConfig<EvaluateConfig<Config, boolean>>>(
    config?: Config
  ) => InputValueType<URI, Config, EvaluateConfig<Config, boolean>>;
  customArg: <
    Type extends AnyScalarType<URI>,
    Config extends InputTypeConfig<EvaluateConfig<Config, Type["_A"]>>
  >(
    type: () => Type,
    config?: Config
  ) => InputValueType<URI, Config, EvaluateConfig<Config, Type["_A"]>>;
  floatArg: <Config extends InputTypeConfig<EvaluateConfig<Config, number>>>(
    config?: Config
  ) => InputValueType<URI, Config, EvaluateConfig<Config, number>>;
  idArg: <Config extends InputTypeConfig<EvaluateConfig<Config, string>>>(
    config?: Config
  ) => InputValueType<URI, Config, EvaluateConfig<Config, string>>;
  intArg: <Config extends InputTypeConfig<EvaluateConfig<Config, number>>>(
    config?: Config
  ) => InputValueType<URI, Config, EvaluateConfig<Config, number>>;
  objectArg: <
    Config extends InputTypeConfig<EvaluateConfig<Config, Type["_A"]>>,
    Type extends AnyInputObjectType<URI>
  >(
    type: () => Type,
    config?: Config
  ) => InputObjectValueType<URI, Config, Type, EvaluateConfig<Config, Type["_A"]>>;
  stringArg: <Config extends InputTypeConfig<EvaluateConfig<Config, string>>>(
    config?: Config
  ) => InputValueType<URI, Config, EvaluateConfig<Config, string>>;
}
