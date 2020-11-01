import { pipe } from "@principia/core/Function";
import type * as S from "@principia/core/Show";

import type { AnyEnv, Model, SummonerEnv, SummonerPURI, SummonerRURI } from "../../HKT";
import type { Summoner } from "../../summoner";
import { merge } from "../../utils";
import { IntersectionShow } from "./intersection";
import { NewtypeShow } from "./newtype";
import { NullableShow } from "./nullable";
import { ObjectShow } from "./object";
import { PrimitivesShow } from "./primitives";
import { RecordShow } from "./record";
import { RecursiveShow } from "./recursive";
import { RefinementShow } from "./refinement";
import { SetShow } from "./set";
import { SumShow } from "./sum";

export const AllShowInterpreters = <Env extends AnyEnv>() =>
   merge(
      PrimitivesShow<Env>(),
      RefinementShow<Env>(),
      RecordShow<Env>(),
      ObjectShow<Env>(),
      NewtypeShow<Env>(),
      RecursiveShow<Env>(),
      SetShow<Env>(),
      SumShow<Env>(),
      NullableShow<Env>(),
      IntersectionShow<Env>()
   );

export const deriveFor = <Su extends Summoner<any>>(S: Su) => (
   env: {
      [K in S.URI & keyof SummonerEnv<Su>]: SummonerEnv<Su>[K];
   }
) => <S, R, E, A>(F: Model<SummonerPURI<Su>, SummonerRURI<Su>, SummonerEnv<Su>, S, R, E, A>): S.Show<A> =>
   pipe(env, F.derive(AllShowInterpreters()));
