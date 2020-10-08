import type { Compactable } from "../Compactable";
import type { Functor } from "../Functor";
import type * as HKT from "../HKT";
import type { FilterF, UC_FilterF } from "./FilterF";
import type { MapEitherF, UC_MapEitherF } from "./MapEitherF";
import type { MapOptionF, UC_MapOptionF } from "./MapOptionF";
import type { PartitionF, UC_PartitionF } from "./PartitionF";

export interface Filterable<F extends HKT.URIS, C = HKT.Auto> extends Functor<F, C>, Compactable<F, C> {
   readonly mapEither_: UC_MapEitherF<F, C>;
   readonly mapEither: MapEitherF<F, C>;
   readonly partition_: UC_PartitionF<F, C>;
   readonly partition: PartitionF<F, C>;
   readonly mapOption_: UC_MapOptionF<F, C>;
   readonly mapOption: MapOptionF<F, C>;
   readonly filter_: UC_FilterF<F, C>;
   readonly filter: FilterF<F, C>;
}
