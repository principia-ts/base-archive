import type { AnyEnv, Config, InterpretedKind, InterpreterURIS } from '../HKT'
import type { Option } from '@principia/base/Option'

export const NullableURI = 'model/algebra/nullable'

export type NullableURI = typeof NullableURI

declare module '../HKT' {
  interface URItoAlgebra<IURI, Env> {
    readonly [NullableURI]: NullableAlgebra<IURI, Env>
  }
}

export interface NullableConfig<I, E, A, O> {}
export interface OptionalConfig<I, E, A, O> {}

export interface NullableAlgebra<F extends InterpreterURIS, Env extends AnyEnv> {
  readonly nullable_: <I, E, A, O>(
    a: InterpretedKind<F, Env, I, E, A, O>,
    config?: Config<Env, I | null | undefined, E, A | null, O | null, NullableConfig<I, E, A, O>>
  ) => InterpretedKind<F, Env, I | null | undefined, E, A | null, O | null>

  readonly optional_: <I, E, A, O>(
    a: InterpretedKind<F, Env, I, E, A, O>,
    config?: Config<Env, I | null | undefined, E, Option<A>, O | null, OptionalConfig<I, E, A, O>>
  ) => InterpretedKind<F, Env, I | null | undefined, E, Option<A>, O | null>
}
