import { constant } from "../Function";
import type * as HKT from "../HKT";
import type * as TC from "../typeclass-index";

export const pure = <F extends HKT.URIS, C = HKT.Auto>(F: TC.Applicative<F, C>): TC.PureF<F, C> => (a) => F.pure(a);
