import type * as HKT from "../HKT";
import type { MapWithIndexF, UC_MapWithIndexF } from "./MapWithIndexF";

export interface FunctorWithIndex<F extends HKT.URIS, C = HKT.Auto> extends HKT.Base<F, C> {
   readonly mapWithIndex: MapWithIndexF<F, C>;
   readonly mapWithIndex_: UC_MapWithIndexF<F, C>;
}
