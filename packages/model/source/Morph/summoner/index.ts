import type { AnyEnv, ExtractEnv, Morph, SummonerOps, Summoners, URItoProgram } from "../HKT";
import { makeSummoner } from "../HKT";
import type { RURI } from "../materializer";
import type { PURI } from "../program";
import { cacheUnaryFunction } from "../utils";

export interface Summoner<Env extends AnyEnv> extends Summoners<PURI, RURI, Env> {
   <S, R, E, A>(F: URItoProgram<Env, S, R, E, A>[PURI]): Morph<PURI, RURI, Env, S, R, E, A>;
}

export const summonFor: <Env extends AnyEnv = {}>(env: ExtractEnv<Env, never>) => SummonerOps<Summoner<Env>> = <
   Env extends AnyEnv = {}
>(
   _env: ExtractEnv<Env, never>
) =>
   makeSummoner<Summoner<Env>>(cacheUnaryFunction, (program) => {
      return {
         build: (a) => a
      };
   });

export const { make } = summonFor({});
