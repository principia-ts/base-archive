import type { Alt } from "../Alt";
import type { Applicative } from "../Applicative";
import type * as HKT from "../HKT";
import type { None } from "../None";

export interface Alternative<F extends HKT.URIS, C = HKT.Auto>
   extends Applicative<F, C>,
      Alt<F, C>,
      None<F, C> {}
