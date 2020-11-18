import type { AnyEnv, Config, InterpretedKind, InterpreterURIS } from "../HKT";

export const RecursiveURI = "model/algebra/recursive";

export type RecursiveURI = typeof RecursiveURI;

declare module "../HKT" {
  interface URItoAlgebra<IURI, Env> {
    readonly [RecursiveURI]: RecursiveAlgebra<IURI, Env>;
  }
}

export interface RecursiveConfig<S, R, E, A> {}

export interface RecursiveAlgebra<F extends InterpreterURIS, Env extends AnyEnv> {
  readonly recursive: <S, R, E, A>(
    id: string,
    a: (x: InterpretedKind<F, Env, S, R, E, A>) => InterpretedKind<F, Env, S, R, E, A>,
    config?: Config<Env, S, R, E, A, RecursiveConfig<S, R, E, A>>
  ) => InterpretedKind<F, Env, S, R, E, A>;
}
