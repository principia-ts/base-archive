import type { AnyEnv, Config, InterpretedKind, InterpreterURIS, Param } from '../HKT'

export const StructURI = 'model/algebra/struct'

export type StructURI = typeof StructURI

declare module '../HKT' {
  interface URItoAlgebra<IURI, Env> {
    readonly [StructURI]: StructAlgebra<IURI, Env>
  }
}

export type AnyMProps<F extends InterpreterURIS, Env> = Record<string, InterpretedKind<F, Env, any, any>>

type InferStruct<
  F extends InterpreterURIS,
  Env extends AnyEnv,
  T extends AnyMProps<any, any>,
  P extends Param
> = Readonly<
  {
    [K in keyof T]: T[K] extends InterpretedKind<F, Env, infer E, infer A>
      ? 'E' extends P
        ? E
        : 'A' extends P
        ? A
        : never
      : never
  }
>

export interface StructConfig<Props> {}
export interface PartialConfig<Props> {}
export interface BothConfig<Props, PropsPartial> {}

export interface StructAlgebra<F extends InterpreterURIS, Env extends AnyEnv> {
  readonly struct: <Props extends AnyMProps<F, Env>>(
    properties: Props,
    config?: Config<Env, InferStruct<F, Env, Props, 'E'>, InferStruct<F, Env, Props, 'A'>, StructConfig<Props>>
  ) => InterpretedKind<F, Env, InferStruct<F, Env, Props, 'E'>, InferStruct<F, Env, Props, 'A'>>

  readonly partial: <Props extends AnyMProps<F, Env>>(
    properties: Props,
    config?: Config<
      Env,
      Partial<InferStruct<F, Env, Props, 'E'>>,
      Partial<InferStruct<F, Env, Props, 'A'>>,
      PartialConfig<Props>
    >
  ) => InterpretedKind<F, Env, Partial<InferStruct<F, Env, Props, 'E'>>, Partial<InferStruct<F, Env, Props, 'A'>>>

  readonly both: <Props extends AnyMProps<F, Env>, PropsPartial extends AnyMProps<F, Env>>(
    required: Props,
    optional: PropsPartial,
    config?: Config<
      Env,
      InferStruct<F, Env, Props, 'E'> & Partial<InferStruct<F, Env, PropsPartial, 'E'>>,
      InferStruct<F, Env, Props, 'A'> & Partial<InferStruct<F, Env, PropsPartial, 'A'>>,
      BothConfig<Props, PropsPartial>
    >
  ) => InterpretedKind<
    F,
    Env,
    InferStruct<F, Env, Props, 'E'> & Partial<InferStruct<F, Env, PropsPartial, 'E'>>,
    InferStruct<F, Env, Props, 'A'> & Partial<InferStruct<F, Env, PropsPartial, 'A'>>
  >
}
