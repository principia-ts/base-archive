import type { AnyEnv, Config, InterpretedKind, InterpreterURIS } from '../HKT'
import type { Predicate, Refinement } from '@principia/base/Function'

export const RefinementURI = 'model/algebra/refinement'

export type RefinementURI = typeof RefinementURI

declare module '../HKT' {
  interface URItoAlgebra<IURI, Env> {
    readonly [RefinementURI]: RefinementAlgebra<IURI, Env>
  }
}

export interface RefineConfig<E, A, B> {}
export interface ConstrainConfig<E, A> {}

export interface RefinementAlgebra<F extends InterpreterURIS, Env extends AnyEnv> {
  readonly refine_: <E, A, B extends A>(
    a: InterpretedKind<F, Env, E, A>,
    refinement: Refinement<A, B>,
    name: string,
    config?: Omit<Config<Env, E, B, RefineConfig<E, A, B>>, 'name'>
  ) => InterpretedKind<F, Env, E, B>

  readonly constrain: <E, A>(
    a: InterpretedKind<F, Env, E, A>,
    predicate: Predicate<A>,
    name: string,
    config?: Omit<Config<Env, E, A, ConstrainConfig<E, A>>, 'name'>
  ) => InterpretedKind<F, Env, E, A>
}
