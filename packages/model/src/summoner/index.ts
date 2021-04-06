import type { Model } from '../abstract/Model'
import type { ExtractEnv, SummonerOps, Summoners } from '../abstract/Summoner'
import type { AnyEnv, URItoProgram } from '../HKT'
import type { FastCheckEnv } from '../interpreter/Arbitrary/HKT'
import type { RURI } from '../materializer'
import type { PURI } from '../program'
import type { Erase } from '@principia/base/util/types'

import { makeSummoner } from '../abstract/Summoner'
import { cacheUnaryFunction } from '../utils'

export interface MM<Env, I, E, A, O> extends Model<PURI, RURI, Env, I, E, A, O> {}
export interface MM_<Env, E, A, O> extends MM<Env, unknown, E, A, O> {}

export interface M<Env, I, E, A, O> extends MM<Env & FastCheckEnv, I, E, A, O> {}
export interface M_<Env, E, A, O> extends M<Env, unknown, E, A, O> {}

export const opaque  = <I, A, O, E = never>() => <Env extends {}>(M: M<Env, I, E, A, O>): M<Env, I, E, A, O> => M
export const opaque_ = <A, O, E = never>() => <Env extends {}>(M: M<Env, unknown, E, A, O>): M<Env, unknown, E, A, O> =>
  M

export interface Summoner<Env extends AnyEnv> extends Summoners<PURI, RURI, Env> {
  <I, E, A, O>(F: URItoProgram<Env, I, E, A, O>[PURI]): M<
    unknown extends Erase<Env, FastCheckEnv> ? {} : Erase<Env, FastCheckEnv>,
    I,
    E,
    A,
    O
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
