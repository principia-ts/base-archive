import type * as HKT from "../HKT";
import type { UnitFn, UnitFnComposition } from "./UnitFn";

/**
 * `Unit` describes the `unit` function, which is a natural transformation from the identity
 * of the `syntactic category` of the language, in this case `void`, to a `Functor`
 */
export interface Unit<F extends HKT.URIS, TC = HKT.Auto> extends HKT.Base<F, TC> {
  readonly unit: UnitFn<F, TC>;
}

export interface UnitComposition<
  F extends HKT.URIS,
  G extends HKT.URIS,
  TCF = HKT.Auto,
  TCG = HKT.Auto
> {
  readonly unit: UnitFnComposition<F, G, TCF, TCG>;
}
