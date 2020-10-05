import type { Alt } from "../Alt/Alt";
import type { Bifunctor } from "../Bifunctor";
import type * as HKT from "../HKT";
import type { SwapF } from "./SwapF";

export interface AltBifunctor<F extends HKT.URIS, C = HKT.Auto> extends Bifunctor<F, C>, Alt<F, C> {
   readonly swap: SwapF<F, C>;
}
