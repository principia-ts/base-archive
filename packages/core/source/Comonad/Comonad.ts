import type { Extend } from "../Extend";
import type * as HKT from "../HKT";
import type { ExtractF } from "./ExtractF";

export interface Comonad<F extends HKT.URIS, C = HKT.Auto> extends Extend<F, C> {
   readonly extract: ExtractF<F, C>;
}
