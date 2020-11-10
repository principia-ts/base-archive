import type { Functor } from "../Functor";
import type * as HKT from "../HKT";
import type { BimapFn, BimapFn_ } from "./BimapFn";
import type { MapLeftFn, MapLeftFn_ } from "./MapLeftFn";

export interface Bifunctor<F extends HKT.URIS, C = HKT.Auto> extends Functor<F, C> {
   readonly bimap_: BimapFn_<F, C>;
   readonly bimap: BimapFn<F, C>;
   readonly mapLeft_: MapLeftFn_<F, C>;
   readonly mapLeft: MapLeftFn<F, C>;
}
