import type { AnyEnv, Config, InterpretedKind, InterpreterURIS } from '../HKT'
import type { Ord } from '@principia/base/Ord'
import type * as DE from '@principia/codec/DecodeError'

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
    config?: Config<
      Env,
      unknown,
      DE.LeafE<DE.UnknownArrayE> | DE.ArrayE<DE.IndexE<number, E>> | DE.ParseE<never>,
      ReadonlySet<A>,
      ReadonlyArray<O>,
      SetConfig<unknown, E, A, O>
    >
  ) => InterpretedKind<
    F,
    Env,
    unknown,
    DE.LeafE<DE.UnknownArrayE> | DE.ArrayE<DE.IndexE<number, E>> | DE.ParseE<never>,
    ReadonlySet<A>,
    ReadonlyArray<O>
  >
}
