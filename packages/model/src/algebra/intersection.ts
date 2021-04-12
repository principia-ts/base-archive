import type { AnyEnv, Config, ErrorOf, InterpretedKind, InterpreterURIS, Param } from '../HKT'
import type { UnionToIntersection } from '@principia/base/util/types'
import type * as DE from '@principia/codec/DecodeError'

export const IntersectionURI = 'model/algebra/intersection'

export type IntersectionURI = typeof IntersectionURI

declare module '../HKT' {
  interface URItoAlgebra<IURI, Env> {
    readonly [IntersectionURI]: IntersectionAlgebra<IURI, Env>
  }
}

type InferTuple<
  F extends InterpreterURIS,
  Env extends AnyEnv,
  KS extends ReadonlyArray<InterpretedKind<F, Env, any, any, any, any>>,
  P extends Param
> = {
  [K in keyof KS]: [KS[K]] extends [InterpretedKind<F, Env, infer I, infer E, infer A, infer O>]
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

export interface IntersectionConfig<
  I extends ReadonlyArray<unknown>,
  E extends ReadonlyArray<unknown>,
  A extends ReadonlyArray<unknown>,
  O extends ReadonlyArray<unknown>
> {}

export interface IntersectionAlgebra<F extends InterpreterURIS, Env extends AnyEnv> {
  readonly intersection: <
    Members extends readonly [
      InterpretedKind<F, Env, any, any, any, any>,
      ...(readonly InterpretedKind<F, Env, any, any, any, any>[])
    ]
  >(
    ...members: Members
  ) => (
    config?: Config<
      Env,
      UnionToIntersection<InferTuple<F, Env, Members, 'I'>[number]>,
      DE.IntersectionE<{ [K in keyof Members]: DE.MemberE<K, ErrorOf<F, Env, Members[K]>> }[keyof Members]>,
      UnionToIntersection<InferTuple<F, Env, Members, 'A'>[number]>,
      UnionToIntersection<InferTuple<F, Env, Members, 'O'>[number]>,
      IntersectionConfig<
        InferTuple<F, Env, Members, 'I'>,
        InferTuple<F, Env, Members, 'E'>,
        InferTuple<F, Env, Members, 'A'>,
        InferTuple<F, Env, Members, 'O'>
      >
    >
  ) => InterpretedKind<
    F,
    Env,
    UnionToIntersection<InferTuple<F, Env, Members, 'I'>[number]>,
    DE.IntersectionE<{ [K in keyof Members]: DE.MemberE<K, ErrorOf<F, Env, Members[K]>> }[keyof Members]>,
    UnionToIntersection<InferTuple<F, Env, Members, 'A'>[number]>,
    UnionToIntersection<InferTuple<F, Env, Members, 'O'>[number]>
  >
}
