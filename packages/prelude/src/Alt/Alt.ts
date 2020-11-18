import type { Functor } from "../Functor";
import type * as HKT from "../HKT";
import type { AltFn, AltFn_ } from "./AltFn";
import type { AltWFn, AltWFn_ } from "./AltWFn";

export interface Alt<F extends HKT.URIS, C = HKT.Auto> extends Functor<F, C> {
  readonly alt_: AltFn_<F, C>;
  readonly alt: AltFn<F, C>;
}

export interface AltW<F extends HKT.URIS, C = HKT.Auto> extends Functor<F, C>, Alt<F, C> {
  readonly altW_: AltWFn_<F, C>;
  readonly altW: AltWFn<F, C>;
}
