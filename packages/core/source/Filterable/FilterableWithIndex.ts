import type { FunctorWithIndex } from "../Functor";
import type * as HKT from "../HKT";
import type { Filterable } from "./Filterable";
import type { FilterWithIndexF, UC_FilterWithIndexF } from "./FilterWithIndexF";
import type { MapEitherWithIndexF, UC_MapEitherWithIndexF } from "./MapEitherWithIndexF";
import type { MapMaybeWithIndexF, UC_MapMaybeWithIndexF } from "./MapMaybeWithIndexF";
import type { PartitionWithIndexF, UC_PartitionWithIndexF } from "./PartitionWithIndexF";

export interface FilterableWithIndex<F extends HKT.URIS, C = HKT.Auto>
   extends FunctorWithIndex<F, C>,
      Filterable<F, C> {
   readonly _mapEitherWithIndex: UC_MapEitherWithIndexF<F, C>;
   readonly _partitionWithIndex: UC_PartitionWithIndexF<F, C>;
   readonly _mapMaybeWithIndex: UC_MapMaybeWithIndexF<F, C>;
   readonly _filterWithIndex: UC_FilterWithIndexF<F, C>;
   readonly mapEitherWithIndex: MapEitherWithIndexF<F, C>;
   readonly partitionWithIndex: PartitionWithIndexF<F, C>;
   readonly mapMaybeWithIndex: MapMaybeWithIndexF<F, C>;
   readonly filterWithIndex: FilterWithIndexF<F, C>;
}
