import { pipe } from "../Function";
import type { Functor, FunctorComposition } from "../Functor";
import { getCovariantFunctorComposition } from "../Functor";
import * as HKT from "../HKT";
import type { Unit, UnitComposition } from "../Unit";
import type { BothFn, BothFn_, BothFnComposition, BothFnComposition_ } from "./BothFn";

export interface Applicative<F extends HKT.URIS, TC = HKT.Auto>
  extends Functor<F, TC>,
    Unit<F, TC> {
  readonly both_: BothFn_<F, TC>;
  readonly both: BothFn<F, TC>;
}

export interface ApplicativeComposition<
  F extends HKT.URIS,
  G extends HKT.URIS,
  TCF = HKT.Auto,
  TCG = HKT.Auto
> extends FunctorComposition<F, G, TCF, TCG>,
    UnitComposition<F, G, TCF, TCG> {
  readonly both_: BothFnComposition_<F, G, TCF, TCG>;
  readonly both: BothFnComposition<F, G, TCF, TCG>;
}

export function getApplicativeComposition<
  F extends HKT.URIS,
  G extends HKT.URIS,
  TCF = HKT.Auto,
  TCG = HKT.Auto
>(F: Applicative<F, TCF>, G: Applicative<G, TCG>): ApplicativeComposition<F, G, TCF, TCG>;
export function getApplicativeComposition<F, G>(
  F: Applicative<HKT.UHKT<F>>,
  G: Applicative<HKT.UHKT<G>>
) {
  const both_: BothFnComposition_<HKT.UHKT<F>, HKT.UHKT<G>> = (fga, fgb) =>
    pipe(
      F.both_(fga, fgb),
      F.map(([ga, gb]) => G.both_(ga, gb))
    );
  return HKT.instance<ApplicativeComposition<HKT.UHKT<F>, HKT.UHKT<G>>>({
    ...getCovariantFunctorComposition(F, G),
    unit: () => F.map_(F.unit(), G.unit),
    both_,
    both: (fgb) => (fga) => both_(fga, fgb)
  });
}
