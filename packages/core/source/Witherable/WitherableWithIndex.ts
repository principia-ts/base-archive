import type { FilterableWithIndex } from "../Filterable";
import type * as HKT from "../HKT";
import type { TraversableWithIndex } from "../Traversable";
import type { UC_WiltWithIndexF, WiltWithIndexF } from "./WiltWithIndexF";
import type { Witherable } from "./Witherable";
import type { UC_WitherWithIndexF, WitherWithIndexF } from "./WitherWithIndexF";

export interface WitherableWithIndex<F extends HKT.URIS, C = HKT.Auto>
   extends TraversableWithIndex<F, C>,
      FilterableWithIndex<F, C>,
      Witherable<F, C> {
   readonly _witherWithIndex: UC_WitherWithIndexF<F, C>;
   readonly witherWithIndex: WitherWithIndexF<F, C>;
   readonly _wiltWithIndex: UC_WiltWithIndexF<F, C>;
   readonly wiltWithIndex: WiltWithIndexF<F, C>;
}
