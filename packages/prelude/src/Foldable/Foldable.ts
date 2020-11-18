import * as HKT from "../HKT";
import type {
  FoldMapFn,
  FoldMapFn_,
  FoldMapFnComposition,
  FoldMapFnComposition_
} from "./FoldMapFn";
import type { ReduceFn, ReduceFn_, ReduceFnComposition, ReduceFnComposition_ } from "./ReduceFn";
import type {
  ReduceRightFn,
  ReduceRightFn_,
  ReduceRightFnComposition,
  ReduceRightFnComposition_
} from "./ReduceRightFn";

export interface Foldable<F extends HKT.URIS, C = HKT.Auto> extends HKT.Base<F, C> {
  readonly reduce_: ReduceFn_<F, C>;
  readonly reduce: ReduceFn<F, C>;
  readonly foldMap_: FoldMapFn_<F, C>;
  readonly foldMap: FoldMapFn<F, C>;
  readonly reduceRight_: ReduceRightFn_<F, C>;
  readonly reduceRight: ReduceRightFn<F, C>;
}

export interface FoldableComposition<
  F extends HKT.URIS,
  G extends HKT.URIS,
  CF = HKT.Auto,
  CG = HKT.Auto
> extends HKT.CompositionBase2<F, G, CF, CG> {
  readonly reduce_: ReduceFnComposition_<F, G, CF, CG>;
  readonly reduce: ReduceFnComposition<F, G, CF, CG>;
  readonly foldMap_: FoldMapFnComposition_<F, G, CF, CG>;
  readonly foldMap: FoldMapFnComposition<F, G, CF, CG>;
  readonly reduceRight_: ReduceRightFnComposition_<F, G, CF, CG>;
  readonly reduceRight: ReduceRightFnComposition<F, G, CF, CG>;
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
  const _foldMap: FoldMapFnComposition_<HKT.UHKT<F>, HKT.UHKT<G>> = (M) => (fga, f) =>
    F.foldMap_(M)(fga, (ga) => G.foldMap_(M)(ga, f));
  const _reduce: ReduceFnComposition_<HKT.UHKT<F>, HKT.UHKT<G>> = (fga, b, f) =>
    F.reduce_(fga, b, (b, ga) => G.reduce_(ga, b, f));
  const _reduceRight: ReduceRightFnComposition_<HKT.UHKT<F>, HKT.UHKT<G>> = (fga, b, f) =>
    F.reduceRight_(fga, b, (ga, b) => G.reduceRight_(ga, b, f));

  return HKT.instance<FoldableComposition<HKT.UHKT<F>, HKT.UHKT<G>>>({
    reduce_: _reduce,
    foldMap_: _foldMap,
    reduceRight_: _reduceRight,
    reduce: (b, f) => (fga) => _reduce(fga, b, f),
    foldMap: (M) => (f) => (fga) => _foldMap(M)(fga, f),
    reduceRight: (b, f) => (fga) => _reduceRight(fga, b, f)
  });
}
