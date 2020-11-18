import type * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import * as _ from "./_core";
import type { URI, V } from "./model";

export const Functor: P.Functor<[URI], V> = HKT.instance({
  map: _.map,
  map_: _.map_
});

export const Unit: P.Unit<[URI], V> = HKT.instance({
  unit: _.unit
});

export const Applicative: P.Applicative<[URI], V> = HKT.instance({
  ...Functor,
  ...Unit,
  both: _.both,
  both_: _.both_
});

export const Monad: P.Monad<[URI], V> = HKT.instance({
  ...Functor,
  ...Unit,
  flatten: _.flatten
});

export const MonadFail: P.MonadFail<[URI], V> = HKT.instance({
  ...Monad,
  fail: _.fail
});
