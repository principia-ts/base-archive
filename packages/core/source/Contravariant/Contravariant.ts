import * as HKT from "../HKT";
import { ContramapF, ContramapFComposition } from "./ContramapF";

export interface Contravariant<F extends HKT.URIS, C = HKT.Auto> extends HKT.Base<F, C> {
   readonly contramap: ContramapF<F, C>;
}

export interface ContravariantComposition<
   F extends HKT.URIS,
   G extends HKT.URIS,
   CF = HKT.Auto,
   CG = HKT.Auto
> extends HKT.CompositionBase2<F, G, CF, CG> {
   readonly contramap: ContramapFComposition<F, G, CF, CG>;
}

export function getContravariantComposition<
   F extends HKT.URIS,
   G extends HKT.URIS,
   CF = HKT.Auto,
   CG = HKT.Auto
>(F: Contravariant<F, CF>, G: Contravariant<G, CG>): ContravariantComposition<F, G, CF, CG>;
export function getContravariantComposition<F, G>(
   F: Contravariant<HKT.UHKT<F>>,
   G: Contravariant<HKT.UHKT<G>>
) {
   return HKT.instance<ContravariantComposition<HKT.UHKT<F>, HKT.UHKT<G>>>({
      contramap: (f) => F.contramap(G.contramap(f))
   });
}
