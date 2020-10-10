import type * as HKT from "../HKT";
import type { FilterWithIndexFn, FilterWithIndexFn_ } from "./FilterWithIndexFn";
import type { MapEitherWithIndexFn, MapEitherWithIndexFn_ } from "./MapEitherWithIndexFn";
import type { MapOptionWithIndexFn, MapOptionWithIndexFn_ } from "./MapOptionWithIndexFn";
import type { PartitionWithIndexFn, PartitionWithIndexFn_ } from "./PartitionWithIndexFn";

export interface FilterableWithIndex<F extends HKT.URIS, C = HKT.Auto> extends HKT.Base<F, C> {
   readonly mapEitherWithIndex_: MapEitherWithIndexFn_<F, C>;
   readonly partitionWithIndex_: PartitionWithIndexFn_<F, C>;
   readonly mapOptionWithIndex_: MapOptionWithIndexFn_<F, C>;
   readonly filterWithIndex_: FilterWithIndexFn_<F, C>;
   readonly mapEitherWithIndex: MapEitherWithIndexFn<F, C>;
   readonly partitionWithIndex: PartitionWithIndexFn<F, C>;
   readonly mapOptionWithIndex: MapOptionWithIndexFn<F, C>;
   readonly filterWithIndex: FilterWithIndexFn<F, C>;
}
