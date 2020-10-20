import type * as HKT from "../HKT";
import type { FailFn } from "./FailFn";

export interface FailHKT<F, TC = HKT.Auto> extends HKT.Base<F, TC> {
   readonly fail: <E, A>(e: E) => HKT.HKT2<F, E, A>;
}

export interface Fail<F extends HKT.URIS, TC = HKT.Auto> extends HKT.Base<F, TC> {
   readonly fail: FailFn<F, TC>;
}

export interface Fail1<F extends HKT.URIS1, TC = HKT.Auto> extends HKT.Base<F, TC> {
   readonly fail: <E, A>(e: E) => HKT.Kind1<F, TC, A>;
}

export interface Fail2<F extends HKT.URIS2, TC = HKT.Auto> extends HKT.Base<F, TC> {
   readonly fail: <E, A>(e: E) => HKT.Kind2<F, TC, E, A>;
}

export interface Fail3<F extends HKT.URIS3, TC = HKT.Auto> extends HKT.Base<F, TC> {
   readonly fail: <E, A, R = HKT.Initial3<TC, "R">>(e: E) => HKT.Kind3<F, TC, R, E, A>;
}

export interface Fail4<F extends HKT.URIS4, TC = HKT.Auto> extends HKT.Base<F, TC> {
   readonly fail: <E, A, S = HKT.Initial4<TC, "S">, R = HKT.Initial3<TC, "R">>(e: E) => HKT.Kind4<F, TC, S, R, E, A>;
}
