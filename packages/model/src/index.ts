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
export const getDecoder = Dec.deriveFor(make)({});
export const getEncoder = Enc.deriveFor(make)({});
export const getEq = Eq.deriveFor(make)({});
export const getGuard = G.deriveFor(make)({});
export const getArbitrary = Arb.deriveFor(make)({
   [ArbURI]: {
      module: fc
   }
});

export {} from "./interpreter/Eq/HKT";
export {} from "./interpreter/Show/HKT";
export {} from "./interpreter/Guard/HKT";
export {} from "./interpreter/Encoder/HKT";
export {} from "./interpreter/Decoder/HKT";
export {} from "./interpreter/Arbitrary/HKT";
export {} from "./HKT";
