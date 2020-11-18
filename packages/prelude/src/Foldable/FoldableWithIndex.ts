import * as HKT from "../HKT";
import type { Monoid } from "../Monoid";
import type {
  FoldMapWithIndexFn,
  FoldMapWithIndexFn_,
  FoldMapWithIndexFnComposition,
  FoldMapWithIndexFnComposition_
} from "./FoldMapWithIndexFn";
import type {
  ReduceRightWithIndexFn,
  ReduceRightWithIndexFn_,
  ReduceRightWithIndexFnComposition,
  ReduceRightWithIndexFnComposition_
} from "./ReduceRightWithIndexFn";
import type {
  ReduceWithIndexFn,
  ReduceWithIndexFn_,
  ReduceWithIndexFnComposition,
  ReduceWithIndexFnComposition_
} from "./ReduceWithIndexFn";

export interface FoldableWithIndex<F extends HKT.URIS, C = HKT.Auto> extends HKT.Base<F, C> {
  readonly reduceWithIndex_: ReduceWithIndexFn_<F, C>;
  readonly reduceWithIndex: ReduceWithIndexFn<F, C>;
  readonly foldMapWithIndex_: FoldMapWithIndexFn_<F, C>;
  readonly foldMapWithIndex: FoldMapWithIndexFn<F, C>;
  readonly reduceRightWithIndex_: ReduceRightWithIndexFn_<F, C>;
  readonly reduceRightWithIndex: ReduceRightWithIndexFn<F, C>;
}

export interface FoldableWithIndexComposition<
  F extends HKT.URIS,
  G extends HKT.URIS,
  CF = HKT.Auto,
  CG = HKT.Auto
> extends HKT.CompositionBase2<F, G, CF, CG> {
  readonly reduceWithIndex_: ReduceWithIndexFnComposition_<F, G, CF, CG>;
  readonly reduceWithIndex: ReduceWithIndexFnComposition<F, G, CF, CG>;
  readonly foldMapWithIndex_: FoldMapWithIndexFnComposition_<F, G, CF, CG>;
  readonly foldMapWithIndex: FoldMapWithIndexFnComposition<F, G, CF, CG>;
  readonly reduceRightWithIndex_: ReduceRightWithIndexFnComposition_<F, G, CF, CG>;
  readonly reduceRightWithIndex: ReduceRightWithIndexFnComposition<F, G, CF, CG>;
}

export function getFoldableWithIndexComposition<
  F extends HKT.URIS,
  G extends HKT.URIS,
  CF = HKT.Auto,
  CG = HKT.Auto
>(
  F: FoldableWithIndex<F, CF>,
  G: FoldableWithIndex<G, CG>
): FoldableWithIndexComposition<F, G, CF, CG>;
export function getFoldableWithIndexComposition<F, G>(
  F: FoldableWithIndex<HKT.UHKT<F>>,
  G: FoldableWithIndex<HKT.UHKT<G>>
) {
  const reduceWithIndex_: ReduceWithIndexFnComposition_<HKT.UHKT<F>, HKT.UHKT<G>> = <KF, KG, A, B>(
    fga: HKT.HKT<F, HKT.HKT<G, A>>,
    b: B,
    f: (k: [KF, KG], b: B, a: A) => B
  ) =>
    F.reduceWithIndex_(fga, b, (fi: KF, b, ga: HKT.HKT<G, A>) =>
      G.reduceWithIndex_(ga, b, (gi: KG, b, a: A) => f([fi, gi], b, a))
    );

  const foldMapWithIndex_: FoldMapWithIndexFnComposition_<HKT.UHKT<F>, HKT.UHKT<G>> = <M>(
    M: Monoid<M>
  ) => <KF, KG, A>(fga: HKT.HKT<F, HKT.HKT<G, A>>, f: (k: [KF, KG], a: A) => M) =>
    F.foldMapWithIndex_(M)(fga, (kf: KF, ga) =>
      G.foldMapWithIndex_(M)(ga, (kg: KG, a) => f([kf, kg], a))
    );

  const reduceRightWithIndex_: ReduceRightWithIndexFnComposition_<HKT.UHKT<F>, HKT.UHKT<G>> = <
    KF,
    KG,
    A,
    B
  >(
    fga: HKT.HKT<F, HKT.HKT<G, A>>,
    b: B,
    f: (k: [KF, KG], a: A, b: B) => B
  ) =>
    F.reduceRightWithIndex_(fga, b, (fi: KF, ga: HKT.HKT<G, A>, b) =>
      G.reduceRightWithIndex_(ga, b, (gi: KG, a: A, b) => f([fi, gi], a, b))
    );
  return HKT.instance<FoldableWithIndexComposition<HKT.UHKT<F>, HKT.UHKT<G>>>({
    reduceWithIndex_,
    foldMapWithIndex_,
    reduceRightWithIndex_,
    reduceWithIndex: (b, f) => (fga) => reduceWithIndex_(fga, b, f),
    foldMapWithIndex: (M) => (f) => (fga) => foldMapWithIndex_(M)(fga, f),
    reduceRightWithIndex: (b, f) => (fga) => reduceRightWithIndex_(fga, b, f)
  });
}
