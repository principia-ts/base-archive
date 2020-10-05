import type { Functor } from "../../Functor";
import type * as HKT from "../../HKT";
import type { ApF, UC_ApF } from "./ApF";
import type { MapBothF, UC_MapBothF } from "./MapBothF";

export interface ApplyX<F extends HKT.URIS, C = HKT.Auto> extends Functor<F, C> {
   readonly _ap: UC_ApF<F, C>;
   readonly ap: ApF<F, C>;
   readonly _mapBoth: UC_MapBothF<F, C>;
   readonly mapBoth: MapBothF<F, C>;
}
