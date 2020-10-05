import * as HKT from "../HKT";
import { FoldMapF, FoldMapFComposition, UC_FoldMapF, UC_FoldMapFComposition } from "./FoldMapF";
import { ReduceF, ReduceFComposition, UC_ReduceF, UC_ReduceFComposition } from "./ReduceF";
import {
   ReduceRightF,
   ReduceRightFComposition,
   UC_ReduceRightF,
   UC_ReduceRightFComposition
} from "./ReduceRightF";

export interface Foldable<F extends HKT.URIS, C = HKT.Auto> extends HKT.Base<F, C> {
   readonly _reduce: UC_ReduceF<F, C>;
   readonly reduce: ReduceF<F, C>;
   readonly _foldMap: UC_FoldMapF<F, C>;
   readonly foldMap: FoldMapF<F, C>;
   readonly _reduceRight: UC_ReduceRightF<F, C>;
   readonly reduceRight: ReduceRightF<F, C>;
}

export interface FoldableComposition<
   F extends HKT.URIS,
   G extends HKT.URIS,
   CF = HKT.Auto,
   CG = HKT.Auto
> extends HKT.CompositionBase2<F, G, CF, CG> {
   readonly _reduce: UC_ReduceFComposition<F, G, CF, CG>;
   readonly reduce: ReduceFComposition<F, G, CF, CG>;
   readonly _foldMap: UC_FoldMapFComposition<F, G, CF, CG>;
   readonly foldMap: FoldMapFComposition<F, G, CF, CG>;
   readonly _reduceRight: UC_ReduceRightFComposition<F, G, CF, CG>;
   readonly reduceRight: ReduceRightFComposition<F, G, CF, CG>;
}

export function getFoldableComposition<
   F extends HKT.URIS,
   G extends HKT.URIS,
   CF = HKT.Auto,
   CG = HKT.Auto
>(F: Foldable<F, CF>, G: Foldable<G, CG>): FoldableComposition<F, G, CF, CG>;
export function getFoldableComposition<F, G>(
   F: Foldable<HKT.UHKT<F>>,
   G: Foldable<HKT.UHKT<G>>
): FoldableComposition<HKT.UHKT<F>, HKT.UHKT<G>> {
   const _foldMap: UC_FoldMapFComposition<HKT.UHKT<F>, HKT.UHKT<G>> = (M) => (fga, f) =>
      F._foldMap(M)(fga, (ga) => G._foldMap(M)(ga, f));
   const _reduce: UC_ReduceFComposition<HKT.UHKT<F>, HKT.UHKT<G>> = (fga, b, f) =>
      F._reduce(fga, b, (b, ga) => G._reduce(ga, b, f));
   const _reduceRight: UC_ReduceRightFComposition<HKT.UHKT<F>, HKT.UHKT<G>> = (fga, b, f) =>
      F._reduceRight(fga, b, (ga, b) => G._reduceRight(ga, b, f));

   return HKT.instance<FoldableComposition<HKT.UHKT<F>, HKT.UHKT<G>>>({
      _reduce,
      _foldMap,
      _reduceRight,
      reduce: (b, f) => (fga) => _reduce(fga, b, f),
      foldMap: (M) => (f) => (fga) => _foldMap(M)(fga, f),
      reduceRight: (b, f) => (fga) => _reduceRight(fga, b, f)
   });
}
