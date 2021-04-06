import type { AnyEnv, InterpreterURIS, ProgramURIS, ResultURIS, URItoProgram, URItoResult } from '../HKT'
import type { InhabitedTypes } from '../utils'
import type { Overloads } from './Program'
import type { ProgramInterpreter } from './ProgramInterpreter'

import { OpticsFor } from '../optics'
import { assignCallable, assignFunction, inhabitTypes, wrapFun } from '../utils'
import { interpretable } from './Program'

export interface Interpretable<PURI extends ProgramURIS, Env extends AnyEnv, I, E, A, O> {
  derive: Overloads<URItoProgram<Env, I, E, A, O>[PURI]>
}

export interface InhabitedInterpreterAndAlgebra<PURI extends ProgramURIS, RURI extends ResultURIS> {
  readonly _P: PURI
  readonly _M: RURI
}

const inhabitInterpreterAndAlgebra = <PURI extends ProgramURIS, RURI extends ResultURIS, T>(
  t: T
): T & InhabitedInterpreterAndAlgebra<PURI, RURI> => t as T & InhabitedInterpreterAndAlgebra<PURI, RURI>

export type Model<PURI extends ProgramURIS, RURI extends ResultURIS, Env extends AnyEnv, I, E, A, O> = URItoResult<
  I,
  E,
  A,
  O
>[RURI] &
  URItoProgram<Env, I, E, A, O>[PURI] &
  URItoResult<I, E, A, O>[RURI] &
  InhabitedTypes<Env, I, E, A, O> &
  Interpretable<PURI, Env, I, E, A, O> &
  InhabitedInterpreterAndAlgebra<PURI, RURI> &
  OpticsFor<A>

function interpret<PURI extends ProgramURIS, RURI extends ResultURIS, Env extends AnyEnv, I, E, A, O>(
  program: URItoProgram<Env, I, E, A, O>[PURI],
  programInterpreter: ProgramInterpreter<PURI, RURI>
): Model<PURI, RURI, Env, I, E, A, O> & InhabitedTypes<Env, I, E, A, O> {
  return inhabitInterpreterAndAlgebra(
    inhabitTypes(assignFunction(wrapFun(program as any), programInterpreter(program)))
  )
}

export function materialize<PURI extends ProgramURIS, IURI extends InterpreterURIS, Env extends AnyEnv, I, E, A, O>(
  program: URItoProgram<Env, I, E, A, O>[PURI],
  programInterpreter: ProgramInterpreter<PURI, IURI>
): Model<PURI, IURI, Env, I, E, A, O> {
  const morph = interpret(program, programInterpreter)
  return assignCallable(morph, {
    ...OpticsFor<A>(),
    derive: interpretable(morph)
  })
}
