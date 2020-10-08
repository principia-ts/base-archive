import * as HKT from "../HKT";
import type * as TC from "../typeclass-index";
import type { URI, V } from "./Identity";
import {
   alt,
   alt_,
   ap,
   ap_,
   chain,
   chain_,
   extend,
   extract,
   flatten,
   foldMap,
   foldMap_,
   map,
   map_,
   mapBoth,
   mapBoth_,
   pure,
   reduce,
   reduce_,
   reduceRight,
   reduceRight_,
   sequence,
   traverse,
   traverse_
} from "./methods";

export const Functor: TC.Functor<[URI], V> = HKT.instance({
   map_: map_,
   map
});

export const Apply: TC.Apply<[URI], V> = HKT.instance({
   ...Functor,
   ap_: ap_,
   ap,
   mapBoth_: mapBoth_,
   mapBoth
});

export const Applicative: TC.Applicative<[URI], V> = HKT.instance({
   ...Apply,
   pure
});

export const Monad: TC.Monad<[URI], V> = HKT.instance({
   ...Applicative,
   chain_: chain_,
   chain,
   flatten
});

export const Foldable: TC.Foldable<[URI], V> = HKT.instance({
   reduce_: reduce_,
   reduce,
   foldMap_: foldMap_,
   foldMap,
   reduceRight_: reduceRight_,
   reduceRight
});

export const Traversable: TC.Traversable<[URI], V> = HKT.instance({
   ...Functor,
   ...Foldable,
   traverse_: traverse_,
   traverse,
   sequence
});

export const Alt: TC.Alt<[URI], V> = HKT.instance({
   ...Functor,
   alt_: alt_,
   alt
});

export const Comonad: TC.Comonad<[URI], V> = HKT.instance({
   ...Functor,
   extend,
   extract
});
