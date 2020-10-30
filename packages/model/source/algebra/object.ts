import type { AnyEnv, Config, InterpretedKind, InterpreterURIS, Param } from "../HKT";

export const ObjectURI = "model/algebra/object";

export type ObjectURI = typeof ObjectURI;

declare module "../HKT" {
   interface URItoAlgebra<IURI, Env> {
      readonly [ObjectURI]: ObjectAlgebra<IURI, Env>;
   }
}

export type AnyMProps<F extends InterpreterURIS, Env> = Record<string, InterpretedKind<F, Env, any, any, any, any>>;

type InferStruct<
   F extends InterpreterURIS,
   Env extends AnyEnv,
   T extends AnyMProps<any, any>,
   P extends Param
> = Readonly<
   {
      [K in keyof T]: T[K] extends InterpretedKind<F, Env, infer S, infer R, infer E, infer A>
         ? "S" extends P
            ? S
            : "R" extends P
            ? R
            : "E" extends P
            ? E
            : "A" extends P
            ? A
            : never
         : never;
   }
>;

export interface TypeConfig<Props> {}
export interface PartialConfig<Props> {}
export interface BothConfig<Props, PropsPartial> {}

export interface ObjectAlgebra<F extends InterpreterURIS, Env extends AnyEnv> {
   readonly type: <Props extends AnyMProps<F, Env>>(
      properties: Props,
      config?: Config<
         Env,
         unknown,
         unknown,
         InferStruct<F, Env, Props, "E">,
         InferStruct<F, Env, Props, "A">,
         TypeConfig<Props>
      >
   ) => InterpretedKind<F, Env, unknown, unknown, InferStruct<F, Env, Props, "E">, InferStruct<F, Env, Props, "A">>;

   readonly partial: <Props extends AnyMProps<F, Env>>(
      properties: Props,
      config?: Config<
         Env,
         unknown,
         unknown,
         Partial<InferStruct<F, Env, Props, "E">>,
         Partial<InferStruct<F, Env, Props, "A">>,
         PartialConfig<Props>
      >
   ) => InterpretedKind<
      F,
      Env,
      unknown,
      unknown,
      Partial<InferStruct<F, Env, Props, "E">>,
      Partial<InferStruct<F, Env, Props, "A">>
   >;

   readonly both: <Props extends AnyMProps<F, Env>, PropsPartial extends AnyMProps<F, Env>>(
      required: Props,
      optional: PropsPartial,
      config?: Config<
         Env,
         unknown,
         unknown,
         InferStruct<F, Env, Props, "E"> & Partial<InferStruct<F, Env, PropsPartial, "E">>,
         InferStruct<F, Env, Props, "A"> & Partial<InferStruct<F, Env, PropsPartial, "A">>,
         BothConfig<Props, PropsPartial>
      >
   ) => InterpretedKind<
      F,
      Env,
      unknown,
      unknown,
      InferStruct<F, Env, Props, "E"> & Partial<InferStruct<F, Env, PropsPartial, "E">>,
      InferStruct<F, Env, Props, "A"> & Partial<InferStruct<F, Env, PropsPartial, "A">>
   >;
}
