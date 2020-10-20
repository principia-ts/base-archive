import type * as HKT from "../HKT";
import type { UnitFn, UnitFnComposition } from "./UnitFn";

export interface UnitHKT<F, TC = HKT.Auto> extends HKT.Base<F, TC> {
   readonly unit: () => HKT.HKT<F, void>;
}

/**
 * `Unit` describes the `unit` function, which is a natural transformation from the identity
 * of the `syntactic category` of the language, in this case `void`, to a `Functor`
 */
export interface Unit<F extends HKT.URIS, TC = HKT.Auto> extends HKT.Base<F, TC> {
   readonly unit: UnitFn<F, TC>;
}

export interface Unit1<F extends HKT.URIS1, TC = HKT.Auto> extends HKT.Base<F, TC> {
   readonly unit: () => HKT.Kind1<F, TC, void>;
}

export interface Unit2<F extends HKT.URIS2, TC = HKT.Auto> extends HKT.Base<F, TC> {
   readonly unit: () => HKT.Kind2<F, TC, HKT.Initial2<TC, "E">, void>;
}

export interface Unit3<F extends HKT.URIS3, TC = HKT.Auto> extends HKT.Base<F, TC> {
   readonly unit: () => HKT.Kind3<F, TC, HKT.Initial3<TC, "R">, HKT.Initial3<TC, "E">, void>;
}

export interface Unit4<F extends HKT.URIS4, TC = HKT.Auto> extends HKT.Base<F, TC> {
   readonly unit: () => HKT.Kind4<F, TC, HKT.Initial4<TC, "S">, HKT.Initial4<TC, "R">, HKT.Initial4<TC, "E">, void>;
}

export interface UnitComposition<F extends HKT.URIS, G extends HKT.URIS, TCF = HKT.Auto, TCG = HKT.Auto> {
   readonly unit: UnitFnComposition<F, G, TCF, TCG>;
}
