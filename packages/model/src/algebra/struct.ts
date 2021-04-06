import type { AnyEnv, Config, InterpretedKind, InterpreterURIS, Param } from '../HKT'
import type { UnknownRecordE } from '@principia/codec/DecodeError'

export const StructURI = 'model/algebra/struct'

export type StructURI = typeof StructURI

declare module '../HKT' {
  interface URItoAlgebra<IURI, Env> {
    readonly [StructURI]: StructAlgebra<IURI, Env>
  }
}

export type AnyUKindProps<F extends InterpreterURIS, Env> = Record<
  string,
  InterpretedKind<F, Env, unknown, any, any, any>
>

export type AnyKindProps<F extends InterpreterURIS, Env> = Record<
  string,
  InterpretedKind<F, Env, unknown, any, any, any>
>

type InferStruct<
  F extends InterpreterURIS,
  Env extends AnyEnv,
  T extends AnyKindProps<any, any>,
  P extends Param
> = Readonly<
  {
    [K in keyof T]: T[K] extends InterpretedKind<F, Env, infer I, infer E, infer A, infer O>
      ? 'I' extends P
        ? I
        : 'E' extends P
        ? E
        : 'A' extends P
        ? A
        : 'O' extends P
        ? O
        : never
      : never
  }
>

export interface StructConfig<Props> {}
export interface PartialConfig<Props> {}
export interface BothConfig<Props, PropsPartial> {}

export interface StructAlgebra<F extends InterpreterURIS, Env extends AnyEnv> {
  readonly struct: <Props extends AnyUKindProps<F, Env>>(
    properties: Props,
    config?: Config<
      Env,
      unknown,
      InferStruct<F, Env, Props, 'E'>[keyof Props] | UnknownRecordE,
      InferStruct<F, Env, Props, 'A'>,
      InferStruct<F, Env, Props, 'O'>,
      StructConfig<Props>
    >
  ) => InterpretedKind<
    F,
    Env,
    unknown,
    InferStruct<F, Env, Props, 'E'>[keyof Props] | UnknownRecordE,
    InferStruct<F, Env, Props, 'A'>,
    InferStruct<F, Env, Props, 'O'>
  >

  readonly partial: <Props extends AnyUKindProps<F, Env>>(
    properties: Props,
    config?: Config<
      Env,
      unknown,
      InferStruct<F, Env, Props, 'E'>[keyof Props] | UnknownRecordE,
      Partial<InferStruct<F, Env, Props, 'A'>>,
      Partial<InferStruct<F, Env, Props, 'O'>>,
      PartialConfig<Props>
    >
  ) => InterpretedKind<
    F,
    Env,
    unknown,
    InferStruct<F, Env, Props, 'E'>[keyof Props] | UnknownRecordE,
    Partial<InferStruct<F, Env, Props, 'A'>>,
    Partial<InferStruct<F, Env, Props, 'O'>>
  >

  readonly both: <Props extends AnyUKindProps<F, Env>, PropsPartial extends AnyUKindProps<F, Env>>(
    required: Props,
    optional: PropsPartial,
    config?: Config<
      Env,
      unknown,
      | InferStruct<F, Env, Props, 'E'>[keyof Props]
      | InferStruct<F, Env, PropsPartial, 'E'>[keyof PropsPartial]
      | UnknownRecordE,
      InferStruct<F, Env, Props, 'A'> & Partial<InferStruct<F, Env, PropsPartial, 'A'>>,
      InferStruct<F, Env, Props, 'O'> & Partial<InferStruct<F, Env, PropsPartial, 'O'>>,
      BothConfig<Props, PropsPartial>
    >
  ) => InterpretedKind<
    F,
    Env,
    unknown,
    | InferStruct<F, Env, Props, 'E'>[keyof Props]
    | InferStruct<F, Env, PropsPartial, 'E'>[keyof PropsPartial]
    | UnknownRecordE,
    InferStruct<F, Env, Props, 'A'> & Partial<InferStruct<F, Env, PropsPartial, 'A'>>,
    InferStruct<F, Env, Props, 'O'> & Partial<InferStruct<F, Env, PropsPartial, 'O'>>
  >
}
