import type * as HKT from "../HKT";
import type { Monad } from "../Monad";
import type { AsksFn } from "./AsksFn";
import type { GiveFn } from "./GiveFn";

export interface MonadEnv<F extends HKT.URIS, C = HKT.Auto> extends Monad<F, C> {
  readonly asks: AsksFn<F, C>;
  readonly give: GiveFn<F, C>;
}
