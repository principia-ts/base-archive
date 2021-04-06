import type { TaggedBuilder } from '../adt/summoner'
import type { AnyEnv, InterpreterURIS, ProgramURIS, ResultURIS, URItoProgram, URItoResult } from '../HKT'
import type { CacheType } from '../utils'
import type { Model } from './Model'
import type { InferredProgram, Overloads } from './Program'

import { makeTagged } from '../adt/summoner'
import { materialize } from './Model'

export interface Summoners<PURI extends ProgramURIS, RURI extends ResultURIS, Env extends AnyEnv> {
  <I, E, A, O>(F: InferredProgram<PURI, Env, I, E, A, O>): Model<PURI, RURI, Env, I, E, A, O>
  readonly _P: PURI
  readonly _M: RURI
  readonly _Env: (_: Env) => void
}

export type SummonerPURI<X extends Summoners<any, any, any>> = NonNullable<X['_P']>

export type SummonerRURI<X extends Summoners<any, any, any>> = NonNullable<X['_M']>

export type SummonerEnv<X extends Summoners<any, any, any>> = NonNullable<Parameters<X['_Env']>[0]>

export interface SummonerOps<S extends Summoners<any, any, any> = never> {
  readonly make: S
  readonly makeADT: TaggedBuilder<SummonerPURI<S>, SummonerRURI<S>, SummonerEnv<S>>
}

export function makeSummoner<Su extends Summoners<any, any, any> = never>(
  cacheProgramEval: CacheType,
  programInterpreter: <I, E, A, O>(
    program: Overloads<URItoProgram<SummonerEnv<Su>, I, E, A, O>[SummonerPURI<Su>]>
  ) => URItoResult<I, E, A, O>[SummonerRURI<Su>]
): SummonerOps<Su> {
  type PURI = SummonerPURI<Su>
  type IURI = SummonerRURI<Su>
  type Env = SummonerEnv<Su>

  type P<I, E, A, O> = URItoProgram<Env, I, E, A, O>[PURI]
  type M<I, E, A, O> = Model<PURI, IURI, Env, I, E, A, O>

  const summon = (<I, E, A, O>(F: P<I, E, A, O>): M<I, E, A, O> =>
    materialize(
      cacheProgramEval(F),
      programInterpreter as <I, E, A, O>(program: P<I, E, A, O>) => URItoResult<I, E, A, O>[IURI]
    )) as Su

  const tagged: TaggedBuilder<PURI, IURI, SummonerEnv<Su>> = makeTagged(summon)
  return {
    make: summon,
    makeADT: tagged
  }
}

export type ExtractEnv<Env extends AnyEnv, SummonerEnv extends InterpreterURIS> = {
  [k in SummonerEnv & keyof Env]: NonNullable<Env>[k & keyof Env]
}
