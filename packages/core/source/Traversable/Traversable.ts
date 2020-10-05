import { Foldable, FoldableComposition, getFoldableComposition } from "../Foldable";
import { flow } from "../Function";
import { Functor, FunctorComposition, getFunctorComposition } from "../Functor";
import type * as HKT from "../HKT";
import type { SequenceF, SequenceFComposition } from "./SequenceF";
import type {
   TraverseF,
   TraverseFComposition,
   UC_TraverseF,
   UC_TraverseFComposition
} from "./TraverseF";

export interface Traversable<F extends HKT.URIS, C = HKT.Auto>
   extends Functor<F, C>,
      Foldable<F, C> {
   readonly _traverse: UC_TraverseF<F, C>;
   readonly traverse: TraverseF<F, C>;
   readonly sequence: SequenceF<F, C>;
}

export interface TraversableComposition<
   F extends HKT.URIS,
   G extends HKT.URIS,
   CF = HKT.Auto,
   CG = HKT.Auto
> extends FoldableComposition<F, G, CF, CG>,
      FunctorComposition<F, G, CF, CG> {
   readonly _traverse: UC_TraverseFComposition<F, G, CF, CG>;
   readonly traverse: TraverseFComposition<F, G, CF, CG>;
   readonly sequence: SequenceFComposition<F, G, CF, CG>;
}

export function getTraversableComposition<
   F extends HKT.URIS,
   G extends HKT.URIS,
   CF = HKT.Auto,
   CG = HKT.Auto
>(F: Traversable<F, CF>, G: Traversable<G, CG>): TraversableComposition<F, G, CF, CG>;
export function getTraversableComposition<F, G>(
   F: Traversable<HKT.UHKT<F>>,
   G: Traversable<HKT.UHKT<G>>
): TraversableComposition<HKT.UHKT<F>, HKT.UHKT<G>> {
   const _traverse: UC_TraverseFComposition<HKT.UHKT<F>, HKT.UHKT<G>> = (H) => (tfga, f) =>
      F._traverse(H)(tfga, (tga) => G._traverse(H)(tga, f));
   return {
      ...getFunctorComposition(F, G),
      ...getFoldableComposition(F, G),
      _traverse,
      traverse: (H) => flow(G.traverse(H), F.traverse(H)),
      sequence: (H) => flow(F.map(G.sequence(H)), F.sequence(H))
   };
}
