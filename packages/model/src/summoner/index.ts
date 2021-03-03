import type { Model } from '../abstract/Model'
import type { ExtractEnv, SummonerOps, Summoners } from '../abstract/Summoner'
import type { AnyEnv, URItoProgram } from '../HKT'
import type { FastCheckEnv } from '../interpreter/Arbitrary/HKT'
import type { RURI } from '../materializer'
import type { PURI } from '../program'
import type { Erase } from '@principia/base/util/types'

import { makeSummoner } from '../abstract/Summoner'
import { cacheUnaryFunction } from '../utils'

export interface MM<Env, E, A> extends Model<PURI, RURI, Env, unknown, unknown, E, A> {}
export interface MM_<Env, A> extends MM<Env, {}, A> {}

export interface M<Env, E, A> extends MM<Env & FastCheckEnv, E, A> {}
export interface M_<Env, A> extends M<Env, {}, A> {}

export const opaque  = <E, A>() => <Env extends {}>(M: M<Env, E, A>): M<Env, E, A> => M
export const opaque_ = <A>() => <Env extends {}>(M: M<Env, {}, A>): M_<Env, A> => M

export interface Summoner<Env extends AnyEnv> extends Summoners<PURI, RURI, Env> {
  <E, A>(F: URItoProgram<Env, any, any, E, A>[PURI]): M<
    unknown extends Erase<Env, FastCheckEnv> ? {} : Erase<Env, FastCheckEnv>,
    E,
    A
  >
}

export function summonFor<Env extends AnyEnv = {}>(
  _env: ExtractEnv<Env, never>
): SummonerOps<Summoner<Env & FastCheckEnv>> {
  return makeSummoner<Summoner<Env & FastCheckEnv>>(cacheUnaryFunction, (program) => {
    return {
      build: (a) => a
    }
  })
}
