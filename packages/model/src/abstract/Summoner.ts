import type { TaggedBuilder } from '../adt/summoner'
import type { AnyEnv, InterpreterURIS, ProgramURIS, ResultURIS, URItoProgram, URItoResult } from '../HKT'
import type { CacheType } from '../utils'
import type { Model } from './Model'
import type { InferredProgram, Overloads } from './Program'

import { makeTagged } from '../adt/summoner'
import { materialize } from './Model'

export interface Summoners<PURI extends ProgramURIS, RURI extends ResultURIS, Env extends AnyEnv> {
  <E, A>(F: InferredProgram<PURI, Env, E, A>): Model<PURI, RURI, Env, E, A>
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
  programInterpreter: <E, A>(
    program: Overloads<URItoProgram<SummonerEnv<Su>, E, A>[SummonerPURI<Su>]>
  ) => URItoResult<E, A>[SummonerRURI<Su>]
): SummonerOps<Su> {
  type PURI = SummonerPURI<Su>
  type IURI = SummonerRURI<Su>
  type Env = SummonerEnv<Su>

  type P<E, A> = URItoProgram<Env, E, A>[PURI]
  type M<E, A> = Model<PURI, IURI, Env, E, A>

  const summon = (<E, A>(F: P<E, A>): M<E, A> =>
    materialize(
      cacheProgramEval(F),
      programInterpreter as <E, A>(program: P<E, A>) => URItoResult<E, A>[IURI]
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
