import type * as HKT from "../HKT";
import type { WiltFn, WiltFn_ } from "./WiltFn";
import type { WitherFn, WitherFn_ } from "./WitherFn";

export interface Witherable<F extends HKT.URIS, C = HKT.Auto> extends HKT.Base<F, C> {
   readonly wilt_: WiltFn_<F, C>;
   readonly wilt: WiltFn<F, C>;
   readonly wither_: WitherFn_<F, C>;
   readonly wither: WitherFn<F, C>;
}
