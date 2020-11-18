import type * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import {
  ap,
  ap_,
  bimap,
  bimap_,
  both,
  both_,
  fail,
  flatten,
  map,
  map_,
  mapBoth,
  mapBoth_,
  mapError,
  mapError_,
  unit
} from "./_core";
import { bothPar, bothPar_ } from "./applicative-par";
import { apPar, apPar_, mapBothPar, mapBothPar_ } from "./apply-par";
import type { URI, V } from "./model";
import { asks, give } from "./reader";

export const Functor: P.Functor<[URI], V> = HKT.instance({
  map: map,
  map_: map_
});

export const Bifunctor: P.Bifunctor<[URI], V> = HKT.instance({
  ...Functor,
  bimap_,
  bimap,
  mapLeft_: mapError_,
  mapLeft: mapError
});

export const Unit: P.Unit<[URI], V> = HKT.instance({
  unit
});

export const ApplicativeSeq: P.Applicative<[URI], V> = HKT.instance({
  ...Functor,
  ...Unit,
  both,
  both_
});

export const ApplySeq: P.Apply<[URI], V> = HKT.instance({
  ...Functor,
  ap_,
  ap,
  mapBoth_,
  mapBoth
});

export const ApplicativePar: P.Applicative<[URI], V> = HKT.instance({
  ...Functor,
  ...Unit,
  both: bothPar,
  both_: bothPar_
});

export const ApplyPar: P.Apply<[URI], V> = HKT.instance({
  ...Functor,
  ap_: apPar_,
  ap: apPar,
  mapBoth_: mapBothPar_,
  mapBoth: mapBothPar
});

export const Monad: P.Monad<[URI], V> = HKT.instance({
  ...Functor,
  ...Unit,
  flatten
});

export const MonadFail: P.MonadFail<[URI], V> = HKT.instance({
  ...Monad,
  fail
});

export const MonadEnv: P.MonadEnv<[URI], V> = HKT.instance({
  ...Monad,
  asks,
  give
});
