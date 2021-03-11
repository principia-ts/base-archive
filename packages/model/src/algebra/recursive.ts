import type { AnyEnv, Config, InterpretedKind, InterpreterURIS } from '../HKT'

export const RecursiveURI = 'model/algebra/recursive'

export type RecursiveURI = typeof RecursiveURI

declare module '../HKT' {
  interface URItoAlgebra<IURI, Env> {
    readonly [RecursiveURI]: RecursiveAlgebra<IURI, Env>
  }
}

export interface RecursiveConfig<E, A> {}

export interface RecursiveAlgebra<F extends InterpreterURIS, Env extends AnyEnv> {
  readonly recursive: <E, A>(
    id: string,
    a: (x: InterpretedKind<F, Env, E, A>) => InterpretedKind<F, Env, E, A>,
    config?: Config<Env, E, A, RecursiveConfig<E, A>>
  ) => InterpretedKind<F, Env, E, A>
}
