import type * as E from "@principia/core/Encoder";
import { pipe } from "@principia/core/Function";

import type { AnyEnv, Model, SummonerEnv, SummonerPURI, SummonerRURI } from "../../HKT";
import type { Summoner } from "../../summoner";
import { memoize, merge } from "../../utils";
import { IntersectionEncoder } from "./intersection";
import { NewtypeEncoder } from "./newtype";
import { NullableEncoder } from "./nullable";
import { ObjectEncoder } from "./object";
import { PrimitivesEncoder } from "./primitives";
import { RecordEncoder } from "./record";
import { RecursiveEncoder } from "./recursive";
import { RefinementEncoder } from "./refinement";
import { SetEncoder } from "./set";
import { SumEncoder } from "./sum";

export const _allEncoderInterpreters = <Env extends AnyEnv>() =>
   merge(
      PrimitivesEncoder<Env>(),
      RefinementEncoder<Env>(),
      RecordEncoder<Env>(),
      ObjectEncoder<Env>(),
      NewtypeEncoder<Env>(),
      RecursiveEncoder<Env>(),
      SetEncoder<Env>(),
      SumEncoder<Env>(),
      NullableEncoder<Env>(),
      IntersectionEncoder<Env>()
   );

export const allEncoderInterpreters = memoize(_allEncoderInterpreters) as typeof _allEncoderInterpreters;

export const deriveFor = <Su extends Summoner<any>>(S: Su) => (
   env: {
      [K in E.URI & keyof SummonerEnv<Su>]: SummonerEnv<Su>[K];
   }
) => <S, R, E, A>(F: Model<SummonerPURI<Su>, SummonerRURI<Su>, SummonerEnv<Su>, S, R, E, A>): E.Encoder<E, A> =>
   pipe(env, F.derive(allEncoderInterpreters()));
