import { pipe } from "../Function";
import type { Functor, FunctorComposition } from "../Functor";
import { getCovariantFunctorComposition } from "../Functor";
import * as HKT from "../HKT";
import type { ApFn, ApFn_, ApFnComposition, ApFnComposition_ } from "./ApFn";
import type { MapBothFn, MapBothFn_, MapBothFnComposition, MapBothFnComposition_ } from "./MapBothF";

export interface Apply<F extends HKT.URIS, TC = HKT.Auto> extends Functor<F, TC> {
   readonly ap: ApFn<F, TC>;
   readonly ap_: ApFn_<F, TC>;
   readonly mapBoth: MapBothFn<F, TC>;
   readonly mapBoth_: MapBothFn_<F, TC>;
}

export interface ApplyComposition<F extends HKT.URIS, G extends HKT.URIS, TCF = HKT.Auto, TCG = HKT.Auto>
   extends FunctorComposition<F, G, TCF, TCG> {
   readonly ap: ApFnComposition<F, G, TCF, TCG>;
   readonly ap_: ApFnComposition_<F, G, TCF, TCG>;
   readonly mapBoth: MapBothFnComposition<F, G, TCF, TCG>;
   readonly mapBoth_: MapBothFnComposition_<F, G, TCF, TCG>;
}

export function getApplyComposition<F extends HKT.URIS, G extends HKT.URIS, TCF = HKT.Auto, TCG = HKT.Auto>(
   F: Apply<F, TCF>,
   G: Apply<G, TCG>
): ApplyComposition<F, G, TCF, TCG>;
export function getApplyComposition<F, G>(F: Apply<HKT.UHKT<F>>, G: Apply<HKT.UHKT<G>>) {
   const ap_ = <A, B>(
      fgab: HKT.HKT<F, HKT.HKT<G, (a: A) => B>>,
      fga: HKT.HKT<F, HKT.HKT<G, A>>
   ): HKT.HKT<F, HKT.HKT<G, B>> =>
      pipe(
         fgab,
         F.map((gab) => (ga: HKT.HKT<G, A>) => G.ap_(gab, ga)),
         F.ap(fga)
      );

   const mapBoth_: MapBothFnComposition_<HKT.UHKT<F>, HKT.UHKT<G>> = (fga, fgb, f) =>
      pipe(F.mapBoth_(fga, fgb, (ga, gb) => G.mapBoth_(ga, gb, (a, b) => f(a, b))));

   return HKT.instance<ApplyComposition<HKT.UHKT<F>, HKT.UHKT<G>>>({
      ...getCovariantFunctorComposition(F, G),
      ap_,
      ap: (fga) => (fgab) => ap_(fgab, fga),
      mapBoth_,
      mapBoth: (fgb, f) => (fga) => mapBoth_(fga, fgb, f)
   });
}
