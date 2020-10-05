import { Any, AnyFComposition } from "../Any";
import { Apply, ApplyComposition, getApplyComposition } from "../Apply";
import * as HKT from "../HKT";
import { PureF, PureFComposition } from "./PureF";

export interface Applicative<F extends HKT.URIS, C = HKT.Auto> extends Any<F, C>, Apply<F, C> {
   readonly pure: PureF<F, C>;
}

export interface ApplicativeComposition<
   F extends HKT.URIS,
   G extends HKT.URIS,
   CF = HKT.Auto,
   CG = HKT.Auto
> extends ApplyComposition<F, G, CF, CG> {
   readonly any: AnyFComposition<F, G, CF, CG>;
   readonly pure: PureFComposition<F, G, CF, CG>;
}

export function getApplicativeComposition<
   F extends HKT.URIS,
   G extends HKT.URIS,
   CF = HKT.Auto,
   CG = HKT.Auto
>(F: Applicative<F, CF>, G: Applicative<G, CG>): ApplicativeComposition<F, G, CF, CG>;
export function getApplicativeComposition<F, G>(
   F: Applicative<HKT.UHKT<F>>,
   G: Applicative<HKT.UHKT<G>>
) {
   return HKT.instance<ApplicativeComposition<HKT.UHKT<F>, HKT.UHKT<G>>>({
      ...getApplyComposition(F, G),
      pure: (a) => F.pure(G.pure(a)),
      any: () => F.pure(G.any())
   });
}
