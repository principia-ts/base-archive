import type { AnyEnv, Config, InterpretedKind, InterpreterURIS } from '../HKT'
import type { ReadonlyRecord } from '@principia/base/Record'
import type * as DE from '@principia/codec/DecodeError'

export const RecordURI = 'model/algebra/record'

export type RecordURI = typeof RecordURI

declare module '../HKT' {
  interface URItoAlgebra<IURI, Env> {
    readonly [RecordURI]: RecordAlgebra<IURI, Env>
  }
}

export interface RecordConfig<I, E, A, O> {}

export interface RecordAlgebra<F extends InterpreterURIS, Env extends AnyEnv> {
  readonly record: <E, A, O>(
    codomain: InterpretedKind<F, Env, unknown, E, A, O>,
    config?: Config<
      Env,
      unknown,
      DE.CompositionE<DE.UnknownRecordLE | DE.RecordE<DE.OptionalKeyE<string, E>>>,
      ReadonlyRecord<string, A>,
      Record<string, O>,
      RecordConfig<unknown, E, A, O>
    >
  ) => InterpretedKind<
    F,
    Env,
    unknown,
    DE.CompositionE<DE.UnknownRecordLE | DE.RecordE<DE.OptionalKeyE<string, E>>>,
    ReadonlyRecord<string, A>,
    Record<string, O>
  >
}
