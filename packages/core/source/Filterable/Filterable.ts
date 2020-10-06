import type { Compactable } from "../Compactable";
import type { Functor } from "../Functor";
import type * as HKT from "../HKT";
import type { FilterF, UC_FilterF } from "./FilterF";
import type { MapEitherF, UC_MapEitherF } from "./MapEitherF";
import type { MapMaybeF, UC_MapMaybeF } from "./MapMaybeF";
import type { PartitionF, UC_PartitionF } from "./PartitionF";

export interface Filterable<F extends HKT.URIS, C = HKT.Auto> extends Functor<F, C>, Compactable<F, C> {
   readonly _mapEither: UC_MapEitherF<F, C>;
   readonly mapEither: MapEitherF<F, C>;
   readonly _partition: UC_PartitionF<F, C>;
   readonly partition: PartitionF<F, C>;
   readonly _mapMaybe: UC_MapMaybeF<F, C>;
   readonly mapMaybe: MapMaybeF<F, C>;
   readonly _filter: UC_FilterF<F, C>;
   readonly filter: FilterF<F, C>;
}
