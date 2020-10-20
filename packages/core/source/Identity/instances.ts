import type * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import {
   alt,
   alt_,
   ap,
   ap_,
   both,
   both_,
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
   reduce,
   reduce_,
   reduceRight,
   reduceRight_,
   sequence,
   traverse,
   traverse_,
   unit
} from "./methods";
import type { URI, V } from "./model";

export const Functor: P.Functor<[URI], V> = HKT.instance({
   map_: map_,
   map
});

export const Apply: P.Apply<[URI], V> = HKT.instance({
   ...Functor,
   ap_: ap_,
   ap,
   mapBoth_: mapBoth_,
   mapBoth
});

export const Applicative: P.Applicative<[URI], V> = HKT.instance({
   ...Functor,
   both_,
   both,
   unit
});

export const Monad: P.Monad<[URI], V> = HKT.instance({
   ...Functor,
   unit,
   flatten
});

export const Foldable: P.Foldable<[URI], V> = HKT.instance({
   reduce_: reduce_,
   reduce,
   foldMap_: foldMap_,
   foldMap,
   reduceRight_: reduceRight_,
   reduceRight
});

export const Traversable: P.Traversable<[URI], V> = HKT.instance({
   ...Functor,
   traverse_: traverse_,
   traverse,
   sequence
});

export const Alt: P.Alt<[URI], V> = HKT.instance({
   ...Functor,
   alt_: alt_,
   alt
});

export const Comonad: P.Comonad<[URI], V> = HKT.instance({
   ...Functor,
   extend,
   extract
});
