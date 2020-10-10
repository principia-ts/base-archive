import type { Functor } from "../Functor";
import type * as HKT from "../HKT";
import type { AltFn, AltFn_ } from "./AltFn";

export interface Alt<F extends HKT.URIS, C = HKT.Auto> extends Functor<F, C> {
   readonly alt_: AltFn_<F, C>;
   readonly alt: AltFn<F, C>;
}
