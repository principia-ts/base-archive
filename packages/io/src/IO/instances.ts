import * as P from "@principia/base/typeclass";
import * as HKT from "@principia/base/HKT";
import {
  URI,
  V,
  map_,
  map,
  ap_,
  ap,
  map2_,
  map2,
  product_,
  product,
  pure,
  unit,
  flatMap,
  flatten,
  flatMap_
} from "./core";
import { getOptionT } from "@principia/base/data/OptionT";

export const Functor = HKT.instance<P.Functor<[URI], V>>({
  imap_: (fa, f, _) => map_(fa, f),
  imap: (f, _) => (fa) => map_(fa, f),
  map_,
  map
});

export const Apply = HKT.instance<P.Apply<[URI], V>>({
  ...Functor,
  ap_,
  ap,
  map2_,
  map2,
  product_,
  product
});

export const Applicative = HKT.instance<P.Applicative<[URI], V>>({
  ...Apply,
  pure,
  unit
});

export const Monad = HKT.instance<P.Monad<[URI], V>>({
  ...Applicative,
  flatMap_,
  flatMap,
  flatten
});

export const IOOption = getOptionT(Monad);
