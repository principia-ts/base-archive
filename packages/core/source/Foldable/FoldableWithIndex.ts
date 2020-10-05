import * as HKT from "../HKT";
import type { Monoid } from "../Monoid";
import { Foldable, FoldableComposition, getFoldableComposition } from "./Foldable";
import {
   FoldMapWithIndexF,
   FoldMapWithIndexFComposition,
   UC_FoldMapWithIndexF,
   UC_FoldMapWithIndexFComposition
} from "./FoldMapWithIndexF";
import {
   ReduceRightWithIndexF,
   ReduceRightWithIndexFComposition,
   UC_ReduceRightWithIndexF,
   UC_ReduceRightWithIndexFComposition
} from "./ReduceRightWithIndexF";
import {
   ReduceWithIndexF,
   ReduceWithIndexFComposition,
   UC_ReduceWithIndexF,
   UC_ReduceWithIndexFComposition
} from "./ReduceWithIndexF";

export interface FoldableWithIndex<F extends HKT.URIS, C = HKT.Auto> extends Foldable<F, C> {
   readonly _reduceWithIndex: UC_ReduceWithIndexF<F, C>;
   readonly reduceWithIndex: ReduceWithIndexF<F, C>;
   readonly _foldMapWithIndex: UC_FoldMapWithIndexF<F, C>;
   readonly foldMapWithIndex: FoldMapWithIndexF<F, C>;
   readonly _reduceRightWithIndex: UC_ReduceRightWithIndexF<F, C>;
   readonly reduceRightWithIndex: ReduceRightWithIndexF<F, C>;
}

export interface FoldableWithIndexComposition<
   F extends HKT.URIS,
   G extends HKT.URIS,
   CF = HKT.Auto,
   CG = HKT.Auto
> extends FoldableComposition<F, G, CF, CG> {
   readonly _reduceWithIndex: UC_ReduceWithIndexFComposition<F, G, CF, CG>;
   readonly reduceWithIndex: ReduceWithIndexFComposition<F, G, CF, CG>;
   readonly _foldMapWithIndex: UC_FoldMapWithIndexFComposition<F, G, CF, CG>;
   readonly foldMapWithIndex: FoldMapWithIndexFComposition<F, G, CF, CG>;
   readonly _reduceRightWithIndex: UC_ReduceRightWithIndexFComposition<F, G, CF, CG>;
   readonly reduceRightWithIndex: ReduceRightWithIndexFComposition<F, G, CF, CG>;
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
   const _reduceWithIndex: UC_ReduceWithIndexFComposition<HKT.UHKT<F>, HKT.UHKT<G>> = <
      KF,
      KG,
      A,
      B
   >(
      fga: HKT.HKT<F, HKT.HKT<G, A>>,
      b: B,
      f: (k: [KF, KG], b: B, a: A) => B
   ) =>
      F._reduceWithIndex(fga, b, (fi: KF, b, ga: HKT.HKT<G, A>) =>
         G._reduceWithIndex(ga, b, (gi: KG, b, a: A) => f([fi, gi], b, a))
      );

   const _foldMapWithIndex: UC_FoldMapWithIndexFComposition<HKT.UHKT<F>, HKT.UHKT<G>> = <M>(
      M: Monoid<M>
   ) => <KF, KG, A>(fga: HKT.HKT<F, HKT.HKT<G, A>>, f: (k: [KF, KG], a: A) => M) =>
      F._foldMapWithIndex(M)(fga, (kf: KF, ga) =>
         G._foldMapWithIndex(M)(ga, (kg: KG, a) => f([kf, kg], a))
      );

   const _reduceRightWithIndex: UC_ReduceRightWithIndexFComposition<HKT.UHKT<F>, HKT.UHKT<G>> = <
      KF,
      KG,
      A,
      B
   >(
      fga: HKT.HKT<F, HKT.HKT<G, A>>,
      b: B,
      f: (k: [KF, KG], a: A, b: B) => B
   ) =>
      F._reduceRightWithIndex(fga, b, (fi: KF, ga: HKT.HKT<G, A>, b) =>
         G._reduceRightWithIndex(ga, b, (gi: KG, a: A, b) => f([fi, gi], a, b))
      );
   return HKT.instance<FoldableWithIndexComposition<HKT.UHKT<F>, HKT.UHKT<G>>>({
      ...getFoldableComposition(F, G),
      _reduceWithIndex,
      _foldMapWithIndex,
      _reduceRightWithIndex,
      reduceWithIndex: (b, f) => (fga) => _reduceWithIndex(fga, b, f),
      foldMapWithIndex: (M) => (f) => (fga) => _foldMapWithIndex(M)(fga, f),
      reduceRightWithIndex: (b, f) => (fga) => _reduceRightWithIndex(fga, b, f)
   });
}
