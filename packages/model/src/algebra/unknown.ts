import type { AnyEnv, Config, InterpretedKind, InterpreterURIS } from '../HKT'

export const UnknownURI = 'model/algebra/unknown'
export type UnknownURI = typeof UnknownURI

declare module '../HKT' {
  interface URItoAlgebra<IURI, Env> {
    readonly [UnknownURI]: UnknownAlgebra<IURI, Env>
  }
}

export interface UnknownConfig {}

export interface UnknownAlgebra<F extends InterpreterURIS, Env extends AnyEnv> {
  readonly unknown: (config?: Config<Env, unknown, unknown, UnknownConfig>) => InterpretedKind<F, Env, unknown, unknown>
}
