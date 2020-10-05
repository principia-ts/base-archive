import type { PureF } from "../../Applicative";
import type * as HKT from "../../HKT";
import type { ApplyX } from "../ApplyX";

export interface ApplicativeX<F extends HKT.URIS, C = HKT.Auto> extends ApplyX<F, C> {
   readonly pure: PureF<F, C>;
}
