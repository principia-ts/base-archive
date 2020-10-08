import type { Functor } from "../Functor";
import type * as HKT from "../HKT";
import type { AltF, UC_AltF } from "./AltF";

export interface Alt<F extends HKT.URIS, C = HKT.Auto> extends Functor<F, C> {
   readonly alt_: UC_AltF<F, C>;
   readonly alt: AltF<F, C>;
}
