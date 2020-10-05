import type { Applicative } from "../Applicative";
import type * as HKT from "../HKT";
import type { ApSF } from "./ApSF";
import type { BindSF } from "./BindSF";
import type { BindToSF } from "./BindToSF";
import type { LetSF } from "./LetSF";

export interface ApplicativeDo<F extends HKT.URIS, C = HKT.Auto> extends Applicative<F, C> {
   readonly bindS: BindSF<F, C>;
   readonly letS: LetSF<F, C>;
   readonly apS: ApSF<F, C>;
   readonly bindToS: BindToSF<F, C>;
}
