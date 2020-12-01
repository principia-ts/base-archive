import type * as HKT from "../HKT";
import type { Monad } from "../Monad";
import type { GetFn } from "./GetFn";
import type { GetsFn } from "./GetsFn";
import type { ModifyFn } from "./ModifyFn";
import type { PutFn } from "./PutFn";

export interface MonadState<F extends HKT.URIS, TC = HKT.Auto> extends Monad<F, TC> {
  readonly get: GetFn<F, TC>;
  readonly put: PutFn<F, TC>;
  readonly modify: ModifyFn<F, TC>;
  readonly gets: GetsFn<F, TC>;
}
