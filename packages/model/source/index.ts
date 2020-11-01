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

export const show = S.deriveFor(make)({});
export const decoder = Dec.deriveFor(make)({});
export const encoder = Enc.deriveFor(make)({});
export const eq = Eq.deriveFor(make)({});
export const guard = G.deriveFor(make)({});
export const arbitrary = Arb.deriveFor(make)({
   [ArbURI]: {
      module: fc
   }
});
