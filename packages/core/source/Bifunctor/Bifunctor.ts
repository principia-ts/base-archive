import type { MapF, UC_MapF } from "../Functor";
import type * as HKT from "../HKT";
import type { BimapF, UC_BimapF } from "./BimapF";
import type { FirstF, UC_FirstF } from "./FirstF";

export interface Bifunctor<F extends HKT.URIS, C = HKT.Auto> {
   readonly _bimap: UC_BimapF<F, C>;
   readonly bimap: BimapF<F, C>;
   readonly _first: UC_FirstF<F, C>;
   readonly first: FirstF<F, C>;
   readonly _second: UC_MapF<F, C>;
   readonly second: MapF<F, C>;
}
