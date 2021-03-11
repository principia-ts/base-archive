import type { AnyEnv, InterpreterURIS, ProgramURIS, ResultURIS, URItoProgram, URItoResult } from '../HKT'
import type { InhabitedTypes } from '../utils'
import type { Overloads } from './Program'
import type { ProgramInterpreter } from './ProgramInterpreter'

import { OpticsFor } from '../optics'
import { assignCallable, assignFunction, inhabitTypes, wrapFun } from '../utils'
import { interpretable } from './Program'

export interface Interpretable<PURI extends ProgramURIS, Env extends AnyEnv, E, A> {
  derive: Overloads<URItoProgram<Env, E, A>[PURI]>
}

export interface InhabitedInterpreterAndAlgebra<PURI extends ProgramURIS, RURI extends ResultURIS> {
  readonly _P: PURI
  readonly _M: RURI
}

const inhabitInterpreterAndAlgebra = <PURI extends ProgramURIS, RURI extends ResultURIS, T>(
  t: T
): T & InhabitedInterpreterAndAlgebra<PURI, RURI> => t as T & InhabitedInterpreterAndAlgebra<PURI, RURI>

export type Model<PURI extends ProgramURIS, RURI extends ResultURIS, Env extends AnyEnv, E, A> = URItoResult<
  E,
  A
>[RURI] &
  URItoProgram<Env, E, A>[PURI] &
  URItoResult<E, A>[RURI] &
  InhabitedTypes<Env, E, A> &
  Interpretable<PURI, Env, E, A> &
  InhabitedInterpreterAndAlgebra<PURI, RURI> &
  OpticsFor<A>

function interpret<PURI extends ProgramURIS, RURI extends ResultURIS, Env extends AnyEnv, E, A>(
  program: URItoProgram<Env, E, A>[PURI],
  programInterpreter: ProgramInterpreter<PURI, RURI>
): Model<PURI, RURI, Env, E, A> & InhabitedTypes<Env, E, A> {
  return inhabitInterpreterAndAlgebra(
    inhabitTypes(assignFunction(wrapFun(program as any), programInterpreter(program)))
  )
}

export function materialize<PURI extends ProgramURIS, IURI extends InterpreterURIS, Env extends AnyEnv, E, A>(
  program: URItoProgram<Env, E, A>[PURI],
  programInterpreter: ProgramInterpreter<PURI, IURI>
): Model<PURI, IURI, Env, E, A> {
  const morph = interpret(program, programInterpreter)
  return assignCallable(morph, {
    ...OpticsFor<A>(),
    derive: interpretable(morph)
  })
}
