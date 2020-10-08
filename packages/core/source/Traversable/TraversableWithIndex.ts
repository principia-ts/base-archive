import type { FoldableWithIndex } from "../Foldable";
import type { FunctorWithIndex } from "../Functor";
import type * as HKT from "../HKT";
import type { Traversable } from "./Traversable";
import type { TraverseWithIndexF, UC_TraverseWithIndexF } from "./TraverseWithIndexF";

export interface TraversableWithIndex<F extends HKT.URIS, C = HKT.Auto>
   extends FunctorWithIndex<F, C>,
      FoldableWithIndex<F, C>,
      Traversable<F, C> {
   readonly traverseWithIndex_: UC_TraverseWithIndexF<F, C>;
   readonly traverseWithIndex: TraverseWithIndexF<F, C>;
}
