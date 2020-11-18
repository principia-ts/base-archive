import type * as HKT from "../HKT";
import type { ChainFn, ChainFn_ } from "./ChainFn";

export interface Chain<F extends HKT.URIS, TC = HKT.Auto> extends HKT.Base<F, TC> {
  readonly chain_: ChainFn_<F, TC>;
  readonly chain: ChainFn<F, TC>;
}
