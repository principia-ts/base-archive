import type { Alt } from "./Alt";
import type { Applicative } from "./Applicative";
import type { Empty } from "./Empty";
import type * as HKT from "./HKT";

export interface Alternative<F extends HKT.URIS, TC = HKT.Auto>
  extends Applicative<F, TC>,
    Empty<F, TC>,
    Alt<F, TC> {}
