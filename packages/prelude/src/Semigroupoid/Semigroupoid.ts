import type * as HKT from "../HKT";
import type { ComposeFn, ComposeFn_ } from "./ComposeFn";

export interface Semigroupoid<F extends HKT.URIS, C = HKT.Auto> extends HKT.Base<F, C> {
  readonly compose_: ComposeFn_<F, C>;
  readonly compose: ComposeFn<F, C>;
}
