import type { AnyEnv, Config, InterpretedKind, InterpreterURIS } from '../HKT'
import type { Newtype } from '@principia/base/Newtype'
import type { Iso } from '@principia/optics/Iso'
import type { Prism } from '@principia/optics/Prism'

export const NewtypeURI = 'model/algebra/newtype'

export type NewtypeURI = typeof NewtypeURI

declare module '../HKT' {
  interface URItoAlgebra<IURI, Env> {
    readonly [NewtypeURI]: NewtypeAlgebra<IURI, Env>
  }
}

export interface IsoConfig<I, E, A, O, N> {}
export interface PrismConfig<I, E, A, O, N> {}

export class NewtypePrismE {
  readonly _tag = 'NewtypePrismE'
  constructor(readonly actual: unknown) {}
}

export interface NewtypeAlgebra<F extends InterpreterURIS, Env extends AnyEnv> {
  readonly newtypeIso: <I, E, A, O, N extends Newtype<any, A>>(
    iso: Iso<A, N>,
    a: InterpretedKind<F, Env, I, E, A, O>,
    config?: Config<Env, I, E, N, O, IsoConfig<I, E, A, O, N>>
  ) => InterpretedKind<F, Env, I, E, N, O>

  readonly newtypePrism: <I, E, A, O, N extends Newtype<any, A>>(
    prism: Prism<A, N>,
    a: InterpretedKind<F, Env, I, E, A, O>,
    config?: Config<Env, I, E | NewtypePrismE, N, O, PrismConfig<I, E, A, O, N>>
  ) => InterpretedKind<F, Env, I, E | NewtypePrismE, N, O>
}
