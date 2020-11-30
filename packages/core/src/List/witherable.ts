import * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import { compact, separate } from "./compactable";
import type { URI, V } from "./model";
import { traverse_ } from "./traversable";

/*
 * -------------------------------------------
 * Witherable List
 * -------------------------------------------
 */

export const wither_ = P.implementWither_<[URI], V>()((_) => (G) => {
  const traverseG_ = traverse_(G);
  return (wa, f) => G.map_(traverseG_(wa, f), compact);
});

export const wither: P.WitherFn<[URI], V> = (G) => {
  const witherG_ = wither_(G);
  return (f) => (wa) => witherG_(wa, f);
};

export const wilt_: P.WiltFn_<[URI], V> = (G) => {
  const traverseG_ = traverse_(G);
  return (wa, f) => G.map_(traverseG_(wa, f), separate);
};

export const wilt: P.WiltFn<[URI], V> = (G) => {
  const wiltG_ = wilt_(G);
  return (f) => (wa) => wiltG_(wa, f);
};

export const Witherable: P.Witherable<[URI], V> = HKT.instance({
  wilt_,
  wilt,
  wither_,
  wither
});
