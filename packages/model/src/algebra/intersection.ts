import type { AnyEnv, Config, InterpretedKind, InterpreterURIS, Param } from "../HKT";
import type { UnionToIntersection } from "@principia/base/util/types";

export const IntersectionURI = "model/algebra/intersection";

export type IntersectionURI = typeof IntersectionURI;

declare module "../HKT" {
  interface URItoAlgebra<IURI, Env> {
    readonly [IntersectionURI]: IntersectionAlgebra<IURI, Env>;
  }
}

type InferTuple<
  F extends InterpreterURIS,
  Env extends AnyEnv,
  KS extends ReadonlyArray<InterpretedKind<F, Env, any, any, any, any>>,
  P extends Param
> = {
  [K in keyof KS]: [KS[K]] extends [InterpretedKind<F, Env, infer S, infer R, infer E, infer A>]
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
};

export interface IntersectionConfig<
  S extends ReadonlyArray<unknown>,
  R extends ReadonlyArray<unknown>,
  E extends ReadonlyArray<unknown>,
  A extends ReadonlyArray<unknown>
> {}

export interface IntersectionAlgebra<F extends InterpreterURIS, Env extends AnyEnv> {
  readonly intersection: <
    KS extends readonly [
      InterpretedKind<F, Env, any, any, any, any>,
      InterpretedKind<F, Env, any, any, any, any>,
      ...(readonly InterpretedKind<F, Env, any, any, any, any>[])
    ]
  >(
    types: KS,
    config?: Config<
      Env,
      UnionToIntersection<InferTuple<F, Env, KS, "S">[number]>,
      UnionToIntersection<InferTuple<F, Env, KS, "R">[number]>,
      UnionToIntersection<InferTuple<F, Env, KS, "E">[number]>,
      UnionToIntersection<InferTuple<F, Env, KS, "A">[number]>,
      IntersectionConfig<
        InferTuple<F, Env, KS, "S">,
        InferTuple<F, Env, KS, "R">,
        InferTuple<F, Env, KS, "E">,
        InferTuple<F, Env, KS, "A">
      >
    >
  ) => InterpretedKind<
    F,
    Env,
    UnionToIntersection<InferTuple<F, Env, KS, "S">[number]>,
    UnionToIntersection<InferTuple<F, Env, KS, "R">[number]>,
    UnionToIntersection<InferTuple<F, Env, KS, "E">[number]>,
    UnionToIntersection<InferTuple<F, Env, KS, "A">[number]>
  >;
}
