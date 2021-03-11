import type { AnyEnv, ProgramURIS, ResultURIS, URItoProgram, URItoResult } from '../HKT'

export interface ProgramInterpreter<PURI extends ProgramURIS, RURI extends ResultURIS> {
  <Env extends AnyEnv, E, A>(program: URItoProgram<Env, E, A>[PURI]): URItoResult<E, A>[RURI]
}
