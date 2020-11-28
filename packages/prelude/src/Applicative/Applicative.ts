import { pipe } from "../Function";
import type { Functor, FunctorComposition } from "../Functor";
import { getCovariantFunctorComposition } from "../Functor";
import * as HKT from "../HKT";
import type { Unit, UnitComposition } from "../Unit";
import type { ZipFn, ZipFn_, ZipFnComposition, ZipFnComposition_ } from "./ZipFn";

export interface Applicative<F extends HKT.URIS, TC = HKT.Auto>
  extends Functor<F, TC>,
    Unit<F, TC> {
  readonly zip_: ZipFn_<F, TC>;
  readonly zip: ZipFn<F, TC>;
}

export interface ApplicativeComposition<
  F extends HKT.URIS,
  G extends HKT.URIS,
  TCF = HKT.Auto,
  TCG = HKT.Auto
> extends FunctorComposition<F, G, TCF, TCG>,
    UnitComposition<F, G, TCF, TCG> {
  readonly zip_: ZipFnComposition_<F, G, TCF, TCG>;
  readonly zip: ZipFnComposition<F, G, TCF, TCG>;
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
  const zip_: ZipFnComposition_<HKT.UHKT<F>, HKT.UHKT<G>> = (fga, fgb) =>
    pipe(
      F.zip_(fga, fgb),
      F.map(([ga, gb]) => G.zip_(ga, gb))
    );
  return HKT.instance<ApplicativeComposition<HKT.UHKT<F>, HKT.UHKT<G>>>({
    ...getCovariantFunctorComposition(F, G),
    unit: () => F.map_(F.unit(), G.unit),
    zip_,
    zip: (fgb) => (fga) => zip_(fga, fgb)
  });
}
