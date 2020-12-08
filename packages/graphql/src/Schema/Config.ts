import type { NonEmptyArray } from "@principia/core/NonEmptyArray";

export interface InputTypeConfig<A> {
  defaultValue?: A;
  description?: string;
  list?: boolean | [boolean];
  required?: boolean;
}
export interface OutputTypeConfig {
  deprecation?: string;
  description?: string;
  list?: boolean | [boolean];
  nullable?: boolean;
}

export type EvaluateConfig<
  Config extends OutputTypeConfig | InputTypeConfig<A>,
  A
> = Config extends OutputTypeConfig
  ? EvaluateNullableConfig<Config, EvaluateListConfig<Config, A>>
  : Config extends InputTypeConfig<any>
  ? EvaluateRequiredConfig<Config, EvaluateListConfig<Config, A>>
  : A;

export type EvaluateListConfig<
  Config extends OutputTypeConfig | InputTypeConfig<A>,
  A
> = OutputTypeConfig extends Config
  ? A
  : InputTypeConfig<A> extends Config
  ? A
  : Config["list"] extends true
  ? Array<A>
  : Config["list"] extends [true]
  ? NonEmptyArray<A>
  : Config["list"] extends [false]
  ? Array<A>
  : A;

export type EvaluateNullableConfig<
  Config extends OutputTypeConfig,
  A
> = OutputTypeConfig extends Config ? A : Config["nullable"] extends true ? A | undefined : A;

export type EvaluateRequiredConfig<
  Config extends InputTypeConfig<any>,
  A
> = InputTypeConfig<A> extends Config ? A : Config["required"] extends false ? A | undefined : A;
