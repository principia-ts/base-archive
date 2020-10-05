import { FoldableWithIndex } from "../Foldable";
import { FunctorWithIndex } from "../Functor";
import type * as HKT from "../HKT";
import { Traversable } from "./Traversable";
import { TraverseWithIndexF, UC_TraverseWithIndexF } from "./TraverseWithIndexF";

export interface TraversableWithIndex<F extends HKT.URIS, C = HKT.Auto>
   extends FunctorWithIndex<F, C>,
      FoldableWithIndex<F, C>,
      Traversable<F, C> {
   readonly _traverseWithIndex: UC_TraverseWithIndexF<F, C>;
   readonly traverseWithIndex: TraverseWithIndexF<F, C>;
}
