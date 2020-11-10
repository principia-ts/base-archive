import type * as HKT from "../HKT";
import type { EmptyFn } from "./EmptyFn";

export interface Empty<F extends HKT.URIS, TC = HKT.Auto> extends HKT.Base<F, TC> {
   readonly empty: EmptyFn<F, TC>;
}
