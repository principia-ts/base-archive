import type { FunctorWithIndex } from "../Functor";
import type * as HKT from "../HKT";
import type { TraverseWithIndexFn, TraverseWithIndexFn_ } from "./TraverseWithIndexFn";

export interface TraversableWithIndex<F extends HKT.URIS, C = HKT.Auto> extends FunctorWithIndex<F, C> {
   readonly traverseWithIndex_: TraverseWithIndexFn_<F, C>;
   readonly traverseWithIndex: TraverseWithIndexFn<F, C>;
}
