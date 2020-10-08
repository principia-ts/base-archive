import type { FunctorWithIndex } from "../Functor";
import type * as HKT from "../HKT";
import type { Filterable } from "./Filterable";
import type { FilterWithIndexF, UC_FilterWithIndexF } from "./FilterWithIndexF";
import type { MapEitherWithIndexF, UC_MapEitherWithIndexF } from "./MapEitherWithIndexF";
import type { MapOptionWithIndexF, UC_MapOptionWithIndexF } from "./MapOptionWithIndexF";
import type { PartitionWithIndexF, UC_PartitionWithIndexF } from "./PartitionWithIndexF";

export interface FilterableWithIndex<F extends HKT.URIS, C = HKT.Auto>
   extends FunctorWithIndex<F, C>,
      Filterable<F, C> {
   readonly mapEitherWithIndex_: UC_MapEitherWithIndexF<F, C>;
   readonly partitionWithIndex_: UC_PartitionWithIndexF<F, C>;
   readonly mapOptionWithIndex_: UC_MapOptionWithIndexF<F, C>;
   readonly filterWithIndex_: UC_FilterWithIndexF<F, C>;
   readonly mapEitherWithIndex: MapEitherWithIndexF<F, C>;
   readonly partitionWithIndex: PartitionWithIndexF<F, C>;
   readonly mapOptionWithIndex: MapOptionWithIndexF<F, C>;
   readonly filterWithIndex: FilterWithIndexF<F, C>;
}
