import type * as HKT from "../HKT";
import type { FilterMapWithIndexFn, FilterMapWithIndexFn_ } from "./FilterMapWithIndexFn";
import type { FilterWithIndexFn, FilterWithIndexFn_ } from "./FilterWithIndexFn";
import type { PartitionMapWithIndexFn, PartitionMapWithIndexFn_ } from "./PartitionMapWithIndexFn";
import type { PartitionWithIndexFn, PartitionWithIndexFn_ } from "./PartitionWithIndexFn";

export interface FilterableWithIndex<F extends HKT.URIS, C = HKT.Auto> extends HKT.Base<F, C> {
  readonly partitionMapWithIndex_: PartitionMapWithIndexFn_<F, C>;
  readonly partitionWithIndex_: PartitionWithIndexFn_<F, C>;
  readonly filterMapWithIndex_: FilterMapWithIndexFn_<F, C>;
  readonly filterWithIndex_: FilterWithIndexFn_<F, C>;
  readonly partitionMapWithIndex: PartitionMapWithIndexFn<F, C>;
  readonly partitionWithIndex: PartitionWithIndexFn<F, C>;
  readonly filterMapWithIndex: FilterMapWithIndexFn<F, C>;
  readonly filterWithIndex: FilterWithIndexFn<F, C>;
}
