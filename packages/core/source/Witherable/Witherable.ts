import type { Filterable } from "../Filterable/Filterable";
import type * as HKT from "../HKT";
import type { Traversable } from "../Traversable";
import type { UC_WiltF, WiltF } from "./WiltF";
import type { UC_WitherF, WitherF } from "./WitherF";

export interface Witherable<F extends HKT.URIS, C = HKT.Auto> extends Traversable<F, C>, Filterable<F, C> {
   readonly wilt_: UC_WiltF<F, C>;
   readonly wilt: WiltF<F, C>;
   readonly wither_: UC_WitherF<F, C>;
   readonly wither: WitherF<F, C>;
}
