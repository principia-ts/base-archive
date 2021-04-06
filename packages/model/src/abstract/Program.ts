import type {
  Algebra,
  AnyEnv,
  InterpretedHKT,
  InterpretedKind,
  InterpreterURIS,
  ProgramURIS,
  UIHKT,
  URItoAURIS,
  URItoProgramAlgebra
} from '../HKT'

export const _overloads: unique symbol = Symbol()

export type Overloads<I extends { [_overloads]?: any }> = NonNullable<I[typeof _overloads]>

export const interpretable = <T extends { [_overloads]?: any }>(program: T): Overloads<T> => program as Overloads<T>

export type InferredAlgebra<PURI extends ProgramURIS, Env extends AnyEnv> = Algebra<URItoAURIS[PURI], UIHKT, Env>

export interface InferredProgram<PURI extends ProgramURIS, Env extends AnyEnv, I, E, A, O> {
  <LEnv extends Env>(a: URItoProgramAlgebra<Env>[PURI]): InterpretedHKT<UIHKT, LEnv, I, E, A, O>
  [_overloads]?: {
    <F extends Exclude<InterpreterURIS, UIHKT>>(a: Algebra<URItoAURIS[PURI], F, Env>): InterpretedKind<
      F,
      { [K in F & keyof Env]: Env[K] },
      I,
      E,
      A,
      O
    >
  }
}
