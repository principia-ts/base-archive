import type { M } from "./summoner";
import type * as HKT from "@principia/base/HKT";
import type * as P from "@principia/base/typeclass";
import type * as D from "@principia/codec/Decoder";

import * as fc from "fast-check";

import * as Arb from "./interpreter/Arbitrary";
import { ArbURI } from "./interpreter/Arbitrary/HKT";
import * as Dec from "./interpreter/Decoder";
import * as Enc from "./interpreter/Encoder";
import * as Eq from "./interpreter/Eq";
import * as G from "./interpreter/Guard";
import * as S from "./interpreter/Show";
import { summonFor } from "./summoner";

export const { make, makeADT } = summonFor({});

export const getShow = S.deriveFor(make)({});
export const getDecoder: <E, A>(
  F: M<{}, E, A>
) => <M extends HKT.URIS, C>(
  M: P.MonadFail<M, D.V<C>> & P.Applicative<M, D.V<C>> & P.Bifunctor<M, C> & P.Alt<M, D.V<C>>
) => D.Decoder<M, C, unknown, A> = Dec.deriveFor(make)({});
export const getEncoder = Enc.deriveFor(make)({});
export const getEq = Eq.deriveFor(make)({});
export const getGuard = G.deriveFor(make)({});
export const getArbitrary = Arb.deriveFor(make)({
  [ArbURI]: {
    module: fc
  }
});

export {} from "./HKT";
export {} from "./interpreter/Arbitrary/HKT";
export {} from "./interpreter/Decoder/HKT";
export {} from "./interpreter/Encoder/HKT";
export {} from "./interpreter/Eq/HKT";
export {} from "./interpreter/Guard/HKT";
export {} from "./interpreter/Show/HKT";
export { M, M_, MM, MM_, opaque, opaque_ } from "./summoner";
export { _A, _E, _Env, _R, _S } from "./utils";
