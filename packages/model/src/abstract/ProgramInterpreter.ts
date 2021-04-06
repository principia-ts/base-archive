import type { AnyEnv, ProgramURIS, ResultURIS, URItoProgram, URItoResult } from '../HKT'

export interface ProgramInterpreter<PURI extends ProgramURIS, RURI extends ResultURIS> {
  <Env extends AnyEnv, I, E, A, O>(program: URItoProgram<Env, I, E, A, O>[PURI]): URItoResult<I, E, A, O>[RURI]
}
