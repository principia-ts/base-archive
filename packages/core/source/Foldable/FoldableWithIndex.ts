import * as HKT from "../HKT";
import type { Monoid } from "../Monoid";
import type { Foldable, FoldableComposition } from "./Foldable";
import { getFoldableComposition } from "./Foldable";
import type {
   FoldMapWithIndexF,
   FoldMapWithIndexFComposition,
   UC_FoldMapWithIndexF,
   UC_FoldMapWithIndexFComposition
} from "./FoldMapWithIndexF";
import type {
   ReduceRightWithIndexF,
   ReduceRightWithIndexFComposition,
   UC_ReduceRightWithIndexF,
   UC_ReduceRightWithIndexFComposition
} from "./ReduceRightWithIndexF";
import type {
   ReduceWithIndexF,
   ReduceWithIndexFComposition,
   UC_ReduceWithIndexF,
   UC_ReduceWithIndexFComposition
} from "./ReduceWithIndexF";

export interface FoldableWithIndex<F extends HKT.URIS, C = HKT.Auto> extends Foldable<F, C> {
   readonly reduceWithIndex_: UC_ReduceWithIndexF<F, C>;
   readonly reduceWithIndex: ReduceWithIndexF<F, C>;
   readonly foldMapWithIndex_: UC_FoldMapWithIndexF<F, C>;
   readonly foldMapWithIndex: FoldMapWithIndexF<F, C>;
   readonly reduceRightWithIndex_: UC_ReduceRightWithIndexF<F, C>;
   readonly reduceRightWithIndex: ReduceRightWithIndexF<F, C>;
}

export interface FoldableWithIndexComposition<F extends HKT.URIS, G extends HKT.URIS, CF = HKT.Auto, CG = HKT.Auto>
   extends FoldableComposition<F, G, CF, CG> {
   readonly reduceWithIndex_: UC_ReduceWithIndexFComposition<F, G, CF, CG>;
   readonly reduceWithIndex: ReduceWithIndexFComposition<F, G, CF, CG>;
   readonly foldMapWithIndex_: UC_FoldMapWithIndexFComposition<F, G, CF, CG>;
   readonly foldMapWithIndex: FoldMapWithIndexFComposition<F, G, CF, CG>;
   readonly reduceRightWithIndex_: UC_ReduceRightWithIndexFComposition<F, G, CF, CG>;
   readonly reduceRightWithIndex: ReduceRightWithIndexFComposition<F, G, CF, CG>;
}

export function getFoldableWithIndexComposition<F extends HKT.URIS, G extends HKT.URIS, CF = HKT.Auto, CG = HKT.Auto>(
   F: FoldableWithIndex<F, CF>,
   G: FoldableWithIndex<G, CG>
): FoldableWithIndexComposition<F, G, CF, CG>;
export function getFoldableWithIndexComposition<F, G>(
   F: FoldableWithIndex<HKT.UHKT<F>>,
   G: FoldableWithIndex<HKT.UHKT<G>>
) {
   const reduceWithIndex_: UC_ReduceWithIndexFComposition<HKT.UHKT<F>, HKT.UHKT<G>> = <KF, KG, A, B>(
      fga: HKT.HKT<F, HKT.HKT<G, A>>,
      b: B,
      f: (k: [KF, KG], b: B, a: A) => B
   ) =>
      F.reduceWithIndex_(fga, b, (fi: KF, b, ga: HKT.HKT<G, A>) =>
         G.reduceWithIndex_(ga, b, (gi: KG, b, a: A) => f([fi, gi], b, a))
      );

   const foldMapWithIndex_: UC_FoldMapWithIndexFComposition<HKT.UHKT<F>, HKT.UHKT<G>> = <M>(M: Monoid<M>) => <
      KF,
      KG,
      A
   >(
      fga: HKT.HKT<F, HKT.HKT<G, A>>,
      f: (k: [KF, KG], a: A) => M
   ) => F.foldMapWithIndex_(M)(fga, (kf: KF, ga) => G.foldMapWithIndex_(M)(ga, (kg: KG, a) => f([kf, kg], a)));

   const reduceRightWithIndex_: UC_ReduceRightWithIndexFComposition<HKT.UHKT<F>, HKT.UHKT<G>> = <KF, KG, A, B>(
      fga: HKT.HKT<F, HKT.HKT<G, A>>,
      b: B,
      f: (k: [KF, KG], a: A, b: B) => B
   ) =>
      F.reduceRightWithIndex_(fga, b, (fi: KF, ga: HKT.HKT<G, A>, b) =>
         G.reduceRightWithIndex_(ga, b, (gi: KG, a: A, b) => f([fi, gi], a, b))
      );
   return HKT.instance<FoldableWithIndexComposition<HKT.UHKT<F>, HKT.UHKT<G>>>({
      ...getFoldableComposition(F, G),
      reduceWithIndex_,
      foldMapWithIndex_,
      reduceRightWithIndex_,
      reduceWithIndex: (b, f) => (fga) => reduceWithIndex_(fga, b, f),
      foldMapWithIndex: (M) => (f) => (fga) => foldMapWithIndex_(M)(fga, f),
      reduceRightWithIndex: (b, f) => (fga) => reduceRightWithIndex_(fga, b, f)
   });
}
