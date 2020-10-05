import * as HKT from "../HKT";
import type * as TC from "../typeclass-index";
import { URI, V } from "./Identity";
import {
   _alt,
   _ap,
   _chain,
   _foldMap,
   _map,
   _mapBoth,
   _reduce,
   _reduceRight,
   _traverse,
   alt,
   any,
   ap,
   chain,
   extend,
   extract,
   foldMap,
   map,
   mapBoth,
   pure,
   reduce,
   reduceRight,
   sequence,
   traverse
} from "./methods";

export const Functor: TC.Functor<[URI], V> = HKT.instance({
   _map,
   map
});

export const Apply: TC.Apply<[URI], V> = HKT.instance({
   ...Functor,
   _ap,
   ap,
   _mapBoth,
   mapBoth
});

export const Applicative: TC.Applicative<[URI], V> = HKT.instance({
   ...Apply,
   pure,
   any
});

export const Monad: TC.Monad<[URI], V> = HKT.instance({
   ...Applicative,
   _chain,
   chain
});

export const Foldable: TC.Foldable<[URI], V> = HKT.instance({
   _reduce,
   reduce,
   _foldMap,
   foldMap,
   _reduceRight,
   reduceRight
});

export const Traversable: TC.Traversable<[URI], V> = HKT.instance({
   ...Functor,
   ...Foldable,
   _traverse,
   traverse,
   sequence
});

export const Alt: TC.Alt<[URI], V> = HKT.instance({
   ...Functor,
   _alt,
   alt
});

export const Comonad: TC.Comonad<[URI], V> = HKT.instance({
   ...Functor,
   extend,
   extract
});
