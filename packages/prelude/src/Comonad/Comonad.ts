import type { Extend } from "../Extend";
import type * as HKT from "../HKT";
import type { ExtractFn } from "./ExtractFn";

export interface Comonad<F extends HKT.URIS, C = HKT.Auto> extends Extend<F, C> {
  readonly extract: ExtractFn<F, C>;
}
