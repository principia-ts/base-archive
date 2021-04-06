import type { AnyEnv, Config, InterpretedKind, InterpreterURIS } from '../HKT'
import type { Ord } from '@principia/base/Ord'
import type { UnknownArrayE } from '@principia/codec/DecodeError'

export const SetURI = 'model/algebra/set'

export type SetURI = typeof SetURI

declare module '../HKT' {
  interface URItoAlgebra<IURI, Env> {
    readonly [SetURI]: SetAlgebra<IURI, Env>
  }
}

export interface SetConfig<I, E, A, O> {}

export interface SetAlgebra<F extends InterpreterURIS, Env extends AnyEnv> {
  readonly set: <E, A, O>(
    type: InterpretedKind<F, Env, unknown, E, A, O>,
    ord: Ord<A>,
    config?: Config<Env, unknown, E | UnknownArrayE, ReadonlySet<A>, ReadonlyArray<O>, SetConfig<unknown, E, A, O>>
  ) => InterpretedKind<F, Env, unknown, E | UnknownArrayE, ReadonlySet<A>, ReadonlyArray<O>>
}
