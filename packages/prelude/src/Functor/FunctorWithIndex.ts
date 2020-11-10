import type * as HKT from "../HKT";
import type { MapWithIndexFn, MapWithIndexFn_ } from "./MapWithIndexFn";

export interface FunctorWithIndex<F extends HKT.URIS, C = HKT.Auto> extends HKT.Base<F, C> {
   readonly mapWithIndex: MapWithIndexFn<F, C>;
   readonly mapWithIndex_: MapWithIndexFn_<F, C>;
}
