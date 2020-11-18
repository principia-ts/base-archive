import type { Predicate, Refinement } from "@principia/core/Function";

import type { AnyEnv, Config, InterpretedKind, InterpreterURIS } from "../HKT";

export const RefinementURI = "model/algebra/refinement";

export type RefinementURI = typeof RefinementURI;

declare module "../HKT" {
  interface URItoAlgebra<IURI, Env> {
    readonly [RefinementURI]: RefinementAlgebra<IURI, Env>;
  }
}

export interface RefineConfig<E, A, B> {}
export interface ConstrainConfig<E, A> {}

export interface RefinementAlgebra<F extends InterpreterURIS, Env extends AnyEnv> {
  readonly refine: <S, R, E, A, B extends A>(
    a: InterpretedKind<F, Env, S, R, E, A>,
    refinement: Refinement<A, B>,
    name: string,
    config?: Omit<Config<Env, unknown, unknown, E, B, RefineConfig<E, A, B>>, "name">
  ) => InterpretedKind<F, Env, unknown, unknown, E, B>;

  readonly constrain: <S, R, E, A>(
    a: InterpretedKind<F, Env, S, R, E, A>,
    predicate: Predicate<A>,
    name: string,
    config?: Omit<Config<Env, unknown, unknown, E, A, ConstrainConfig<E, A>>, "name">
  ) => InterpretedKind<F, Env, unknown, unknown, E, A>;
}
