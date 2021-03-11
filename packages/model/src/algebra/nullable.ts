import type { AnyEnv, Config, InterpretedKind, InterpreterURIS } from '../HKT'
import type { Option } from '@principia/base/Option'

export const NullableURI = 'model/algebra/nullable'

export type NullableURI = typeof NullableURI

declare module '../HKT' {
  interface URItoAlgebra<IURI, Env> {
    readonly [NullableURI]: NullableAlgebra<IURI, Env>
  }
}

export interface NullableConfig<E, A> {}
export interface OptionalConfig<E, A> {}

export interface NullableAlgebra<F extends InterpreterURIS, Env extends AnyEnv> {
  readonly nullable_: <E, A>(
    a: InterpretedKind<F, Env, E, A>,
    config?: Config<Env, E | null, A | null, NullableConfig<E, A>>
  ) => InterpretedKind<F, Env, E | null, A | null>

  readonly optional_: <E, A>(
    a: InterpretedKind<F, Env, E, A>,
    config?: Config<Env, E | undefined, Option<A>, OptionalConfig<E, A>>
  ) => InterpretedKind<F, Env, E | undefined, Option<A>>
}
