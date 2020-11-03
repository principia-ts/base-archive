import type { Functor } from "../Functor";
import type * as HKT from "../HKT";
import type { Unit } from "../Unit";
import type { FlattenFn } from "./FlattenFn";

export interface Monad<F extends HKT.URIS, C = HKT.Auto> extends Functor<F, C>, Unit<F, C> {
   readonly flatten: FlattenFn<F, C>;
}
