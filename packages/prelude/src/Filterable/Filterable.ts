import type * as HKT from "../HKT";
import type { FilterFn, FilterFn_ } from "./FilterFn";
import type { MapEitherFn, MapEitherFn_ } from "./MapEitherFn";
import type { MapOptionFn, MapOptionFn_ } from "./MapOptionFn";
import type { PartitionFn, PartitionFn_ } from "./PartitionFn";

export interface Filterable<F extends HKT.URIS, C = HKT.Auto> extends HKT.Base<F, C> {
  readonly mapEither_: MapEitherFn_<F, C>;
  readonly mapEither: MapEitherFn<F, C>;
  readonly partition_: PartitionFn_<F, C>;
  readonly partition: PartitionFn<F, C>;
  readonly mapOption_: MapOptionFn_<F, C>;
  readonly mapOption: MapOptionFn<F, C>;
  readonly filter_: FilterFn_<F, C>;
  readonly filter: FilterFn<F, C>;
}
