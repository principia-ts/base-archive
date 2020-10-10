import type { MapFn, MapFn_ } from "../Functor";
import type * as HKT from "../HKT";
import type { BimapFn, BimapFn_ } from "./BimapFn";
import type { FirstFn, FirstFn_ } from "./FirstFn";

export interface Bifunctor<F extends HKT.URIS, C = HKT.Auto> extends HKT.Base<F, C> {
   readonly bimap_: BimapFn_<F, C>;
   readonly bimap: BimapFn<F, C>;
   readonly first_: FirstFn_<F, C>;
   readonly first: FirstFn<F, C>;
   readonly second_: MapFn_<F, C>;
   readonly second: MapFn<F, C>;
}
