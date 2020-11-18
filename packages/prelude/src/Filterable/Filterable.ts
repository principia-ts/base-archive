import type * as HKT from "../HKT";
import type { FilterFn, FilterFn_ } from "./FilterFn";
import type { FilterMapFn, FilterMapFn_ } from "./FilterMapFn";
import type { PartitionFn, PartitionFn_ } from "./PartitionFn";
import type { PartitionMapFn, PartitionMapFn_ } from "./PartitionMapFn";

export interface Filterable<F extends HKT.URIS, C = HKT.Auto> extends HKT.Base<F, C> {
  readonly partitionMap_: PartitionMapFn_<F, C>;
  readonly partitionMap: PartitionMapFn<F, C>;
  readonly partition_: PartitionFn_<F, C>;
  readonly partition: PartitionFn<F, C>;
  readonly filterMap_: FilterMapFn_<F, C>;
  readonly filterMap: FilterMapFn<F, C>;
  readonly filter_: FilterFn_<F, C>;
  readonly filter: FilterFn<F, C>;
}
