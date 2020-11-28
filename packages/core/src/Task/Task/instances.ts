import type * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import {
  ap,
  ap_,
  bimap,
  bimap_,
  fail,
  flatten,
  map,
  map_,
  mapError,
  mapError_,
  unit,
  zip,
  zip_,
  zipWith,
  zipWith_
} from "./_core";
import { zipPar, zipPar_ } from "./applicative-par";
import { apPar, apPar_, zipWithPar, zipWithPar_ } from "./apply-par";
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
  zip,
  zip_
});

export const ApplySeq: P.Apply<[URI], V> = HKT.instance({
  ...Functor,
  ap_,
  ap,
  zipWith_,
  zipWith
});

export const ApplicativePar: P.Applicative<[URI], V> = HKT.instance({
  ...Functor,
  ...Unit,
  zip: zipPar,
  zip_: zipPar_
});

export const ApplyPar: P.Apply<[URI], V> = HKT.instance({
  ...Functor,
  ap_: apPar_,
  ap: apPar,
  zipWith_: zipWithPar_,
  zipWith: zipWithPar
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
