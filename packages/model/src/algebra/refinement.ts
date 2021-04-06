import type { AnyEnv, Config, InterpretedKind, InterpreterURIS } from '../HKT'
import type { Predicate } from '@principia/base/Predicate'
import type { Refinement } from '@principia/base/Refinement'

export const RefinementURI = 'model/algebra/refinement'

export type RefinementURI = typeof RefinementURI

declare module '../HKT' {
  interface URItoAlgebra<IURI, Env> {
    readonly [RefinementURI]: RefinementAlgebra<IURI, Env>
  }
}

export interface RefineConfig<I, E, A, O, B> {}
export interface ConstrainConfig<I, E, A, O> {}

export interface RefinementAlgebra<F extends InterpreterURIS, Env extends AnyEnv> {
  readonly refine_: <I, E, A, O, E1, B extends A>(
    type: InterpretedKind<F, Env, I, E, A, O>,
    refinement: Refinement<A, B>,
    onError: (a: A) => E1,
    config?: Config<Env, I, E | E1, B, O, RefineConfig<I, E, A, O, B>>
  ) => InterpretedKind<F, Env, I, E | E1, B, O>

  readonly constrain: <I, E, A, O, E1>(
    a: InterpretedKind<F, Env, I, E, A, O>,
    predicate: Predicate<A>,
    onError: (a: A) => E1,
    config?: Config<Env, I, E | E1, A, O, ConstrainConfig<I, E, A, O>>
  ) => InterpretedKind<F, Env, I, E | E1, A, O>
}
