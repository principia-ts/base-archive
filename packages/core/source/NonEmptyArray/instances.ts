import type * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import {
   alt,
   alt_,
   ap,
   ap_,
   extend,
   flatten,
   foldMap,
   foldMap_,
   foldMapWithIndex,
   foldMapWithIndex_,
   map,
   map_,
   mapWithIndex,
   mapWithIndex_,
   reduce,
   reduce_,
   reduceRight,
   reduceRight_,
   reduceRightWithIndex,
   reduceRightWithIndex_,
   reduceWithIndex,
   reduceWithIndex_,
   sequence,
   traverse,
   traverse_,
   traverseWithIndex,
   traverseWithIndex_,
   unit,
   zip,
   zip_,
   zipWith,
   zipWith_
} from "./methods";
import type { URI, V } from "./model";

export const Functor: P.Functor<[URI], V> = HKT.instance({
   map,
   map_: map_
});

export const FunctorWithIndex: P.FunctorWithIndex<[URI], V> = HKT.instance({
   mapWithIndex,
   mapWithIndex_: mapWithIndex_
});

export const Apply: P.Apply<[URI], V> = HKT.instance({
   ...Functor,
   ap,
   ap_,
   mapBoth: zipWith,
   mapBoth_: zipWith_
});

export const Applicative: P.Applicative<[URI], V> = HKT.instance({
   ...Functor,
   both_: zip_,
   both: zip,
   unit
});

export const Monad: P.Monad<[URI], V> = HKT.instance({
   ...Functor,
   flatten,
   unit
});

export const Alt: P.Alt<[URI], V> = HKT.instance({
   ...Functor,
   alt_,
   alt
});

export const Extend: P.Extend<[URI], V> = HKT.instance({
   ...Functor,
   extend
});

export const Foldable: P.Foldable<[URI], V> = HKT.instance({
   reduce_: reduce_,
   foldMap_: foldMap_,
   reduceRight_: reduceRight_,
   reduce,
   foldMap,
   reduceRight
});

export const FoldableWithIndex: P.FoldableWithIndex<[URI], V> = HKT.instance({
   ...Foldable,
   reduceWithIndex_: reduceWithIndex_,
   foldMapWithIndex_: foldMapWithIndex_,
   reduceRightWithIndex_: reduceRightWithIndex_,
   reduceWithIndex,
   foldMapWithIndex,
   reduceRightWithIndex
});

export const Traversable: P.Traversable<[URI], V> = HKT.instance({
   ...Functor,
   traverse_: traverse_,
   traverse,
   sequence
});

export const TraversableWithIndex: P.TraversableWithIndex<[URI], V> = HKT.instance({
   ...FunctorWithIndex,
   traverseWithIndex_: traverseWithIndex_,
   traverseWithIndex
});
