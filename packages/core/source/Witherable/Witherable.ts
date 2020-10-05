import type { Filterable } from "../Filterable/Filterable";
import type * as HKT from "../HKT";
import type { Traversable } from "../Traversable";
import type { UC_WiltF, WiltF } from "./WiltF";
import type { UC_WitherF, WitherF } from "./WitherF";

export interface Witherable<F extends HKT.URIS, C = HKT.Auto>
   extends Traversable<F, C>,
      Filterable<F, C> {
   readonly _wilt: UC_WiltF<F, C>;
   readonly wilt: WiltF<F, C>;
   readonly _wither: UC_WitherF<F, C>;
   readonly wither: WitherF<F, C>;
}
