import type { AnyEnv, ProgramURIS, ResultURIS, URItoProgram, URItoResult } from '../HKT'

export interface ProgramInterpreter<PURI extends ProgramURIS, RURI extends ResultURIS> {
  <Env extends AnyEnv, S, R, E, A>(program: URItoProgram<Env, S, R, E, A>[PURI]): URItoResult<S, R, E, A>[RURI]
}
