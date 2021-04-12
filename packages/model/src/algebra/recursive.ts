import type { AnyEnv, Config, InterpretedKind, InterpreterURIS } from '../HKT'
import type * as DE from '@principia/codec/DecodeError'

export const RecursiveURI = 'model/algebra/recursive'

export type RecursiveURI = typeof RecursiveURI

declare module '../HKT' {
  interface URItoAlgebra<IURI, Env> {
    readonly [RecursiveURI]: RecursiveAlgebra<IURI, Env>
  }
}

export interface RecursiveConfig<I, E, A, O> {}

export interface RecursiveAlgebra<F extends InterpreterURIS, Env extends AnyEnv> {
  readonly recursive: <I, E, A, O>(
    id: string,
    f: (x: InterpretedKind<F, Env, I, E, A, O>) => InterpretedKind<F, Env, I, E, A, O>,
    config?: Config<Env, I, DE.LazyE<E>, A, O, RecursiveConfig<I, E, A, O>>
  ) => InterpretedKind<F, Env, I, DE.LazyE<E>, A, O>
}
