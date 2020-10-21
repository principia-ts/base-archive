import type { Fail } from "../Fail";
import type * as HKT from "../HKT";
import type { AbsolveFn } from "./AbsolveFn";
import type { RecoverFn } from "./RecoverFn";

export interface Fallible<F extends HKT.URIS, C = HKT.Auto> extends Fail<F, C> {
   readonly absolve: AbsolveFn<F, C>;
   readonly recover: RecoverFn<F, C>;
}
