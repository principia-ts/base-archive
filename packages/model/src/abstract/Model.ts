import type { AnyEnv, InterpreterURIS, ProgramURIS, ResultURIS, URItoProgram, URItoResult } from '../HKT'
import type { InhabitedTypes } from '../utils'
import type { Overloads } from './Program'
import type { ProgramInterpreter } from './ProgramInterpreter'

import { OpticsFor } from '../optics'
import { assignCallable, assignFunction, inhabitTypes, wrapFun } from '../utils'
import { interpretable } from './Program'

export interface Interpretable<PURI extends ProgramURIS, Env extends AnyEnv, S, R, E, A> {
  derive: Overloads<URItoProgram<Env, S, R, E, A>[PURI]>
}

export interface InhabitedInterpreterAndAlgebra<PURI extends ProgramURIS, RURI extends ResultURIS> {
  readonly _P: PURI
  readonly _M: RURI
}

const inhabitInterpreterAndAlgebra = <PURI extends ProgramURIS, RURI extends ResultURIS, T>(
  t: T
): T & InhabitedInterpreterAndAlgebra<PURI, RURI> => t as T & InhabitedInterpreterAndAlgebra<PURI, RURI>

export type Model<PURI extends ProgramURIS, RURI extends ResultURIS, Env extends AnyEnv, S, R, E, A> = URItoResult<
  S,
  R,
  E,
  A
>[RURI] &
  URItoProgram<Env, S, R, E, A>[PURI] &
  URItoResult<S, R, E, A>[RURI] &
  InhabitedTypes<Env, S, R, E, A> &
  Interpretable<PURI, Env, S, R, E, A> &
  InhabitedInterpreterAndAlgebra<PURI, RURI> &
  OpticsFor<A>

function interpret<PURI extends ProgramURIS, RURI extends ResultURIS, Env extends AnyEnv, S, R, E, A>(
  program: URItoProgram<Env, S, R, E, A>[PURI],
  programInterpreter: ProgramInterpreter<PURI, RURI>
): Model<PURI, RURI, Env, S, R, E, A> & InhabitedTypes<Env, S, R, E, A> {
  return inhabitInterpreterAndAlgebra(
    inhabitTypes(assignFunction(wrapFun(program as any), programInterpreter(program)))
  )
}

export function materialize<PURI extends ProgramURIS, IURI extends InterpreterURIS, Env extends AnyEnv, S, R, E, A>(
  program: URItoProgram<Env, S, R, E, A>[PURI],
  programInterpreter: ProgramInterpreter<PURI, IURI>
): Model<PURI, IURI, Env, S, R, E, A> {
  const morph = interpret(program, programInterpreter)
  return assignCallable(morph, {
    ...OpticsFor<A>(),
    derive: interpretable(morph)
  })
}
