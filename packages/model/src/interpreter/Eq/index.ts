import type * as Eq from "@principia/core/Eq";
import { pipe } from "@principia/core/Function";

import type { AnyEnv, Model, SummonerEnv, SummonerPURI, SummonerRURI } from "../../HKT";
import type { Summoner } from "../../summoner";
import { memoize, merge } from "../../utils";
import { IntersectionEq } from "./intersection";
import { NewtypeEq } from "./newtype";
import { NullableEq } from "./nullable";
import { ObjectEq } from "./object";
import { PrimitivesEq } from "./primitives";
import { RecordEq } from "./record";
import { RecursiveEq } from "./recursive";
import { RefinementEq } from "./refinement";
import { SetEq } from "./set";
import { SumEq } from "./sum";

export const _allEqInterpreters = <Env extends AnyEnv>() =>
  merge(
    PrimitivesEq<Env>(),
    RefinementEq<Env>(),
    RecordEq<Env>(),
    ObjectEq<Env>(),
    NewtypeEq<Env>(),
    RecursiveEq<Env>(),
    SetEq<Env>(),
    SumEq<Env>(),
    NullableEq<Env>(),
    IntersectionEq<Env>()
  );

export const allEqInterpreters = memoize(_allEqInterpreters) as typeof _allEqInterpreters;

export const deriveFor = <Su extends Summoner<any>>(S: Su) => (
  env: {
    [K in Eq.URI & keyof SummonerEnv<Su>]: SummonerEnv<Su>[K];
  }
) => <S, R, E, A>(
  F: Model<SummonerPURI<Su>, SummonerRURI<Su>, SummonerEnv<Su>, S, R, E, A>
): Eq.Eq<A> => pipe(env, F.derive(allEqInterpreters()));
