import { pipe } from "../Function";
import { Functor, FunctorComposition, getFunctorComposition } from "../Functor";
import * as HKT from "../HKT";
import type { ApF, ApFComposition, UC_ApF, UC_ApFComposition } from "./ApF";
import { MapBothF, MapBothFComposition, UC_MapBothF, UC_MapBothFComposition } from "./MapBothF";

export interface Apply<F extends HKT.URIS, C = HKT.Auto> extends Functor<F, C> {
   readonly ap: ApF<F, C>;
   readonly _ap: UC_ApF<F, C>;
   readonly mapBoth: MapBothF<F, C>;
   readonly _mapBoth: UC_MapBothF<F, C>;
}

export interface ApplyComposition<F extends HKT.URIS, G extends HKT.URIS, CF = HKT.Auto, CG = HKT.Auto>
   extends FunctorComposition<F, G, CF, CG> {
   readonly ap: ApFComposition<F, G, CF, CG>;
   readonly _ap: UC_ApFComposition<F, G, CF, CG>;
   readonly mapBoth: MapBothFComposition<F, G, CF, CG>;
   readonly _mapBoth: UC_MapBothFComposition<F, G, CF, CG>;
}

export function getApplyComposition<F extends HKT.URIS, G extends HKT.URIS, CF = HKT.Auto, CG = HKT.Auto>(
   F: Apply<F, CF>,
   G: Apply<G, CG>
): ApplyComposition<F, G, CF, CG>;
export function getApplyComposition<F, G>(F: Apply<HKT.UHKT<F>>, G: Apply<HKT.UHKT<G>>) {
   const _ap = <A, B>(
      fgab: HKT.HKT<F, HKT.HKT<G, (a: A) => B>>,
      fga: HKT.HKT<F, HKT.HKT<G, A>>
   ): HKT.HKT<F, HKT.HKT<G, B>> =>
      pipe(
         fgab,
         F.map((gab) => (ga: HKT.HKT<G, A>) => G._ap(gab, ga)),
         F.ap(fga)
      );

   const _mapBoth: UC_MapBothFComposition<HKT.UHKT<F>, HKT.UHKT<G>> = (fga, fgb, f) =>
      pipe(F._mapBoth(fga, fgb, (ga, gb) => G._mapBoth(ga, gb, (a, b) => f(a, b))));

   return HKT.instance<ApplyComposition<HKT.UHKT<F>, HKT.UHKT<G>>>({
      ...getFunctorComposition(F, G),
      _ap,
      ap: (fga) => (fgab) => _ap(fgab, fga),
      _mapBoth,
      mapBoth: (fgb, f) => (fga) => _mapBoth(fga, fgb, f)
   });
}
