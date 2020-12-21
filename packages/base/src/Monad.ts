import type { Applicative } from "./Applicative";
import type { FlatMap } from "./FlatMap";
import type * as HKT from "./HKT";

export interface Monad<F extends HKT.URIS, C = HKT.Auto> extends Applicative<F, C>, FlatMap<F, C> {}
