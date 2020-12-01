import type * as P from "@principia/prelude";
import { tuple } from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import { getApply } from "./apply";
import { getFunctor } from "./functor";
import type { StateT, V } from "./model";

export function getApplicative<F extends HKT.URIS, C>(
  F: P.Monad<F, C>
): P.Applicative<StateT<F>, V<C>>;
export function getApplicative<F>(
  F: P.Monad<HKT.UHKT<F>>
): P.Applicative<StateT<HKT.UHKT<F>>, V<HKT.Auto>> {
  const { zipWith_ } = getApply(F);
  const zip_: P.ZipFn_<StateT<HKT.UHKT<F>>, V<HKT.Auto>> = (fa, fb) => zipWith_(fa, fb, tuple);
  return HKT.instance({
    ...getFunctor(F),
    zip_,
    zip: <S, B>(fb: (s: S) => HKT.HKT<F, readonly [B, S]>) => <A>(
      fa: (s: S) => HKT.HKT<F, readonly [A, S]>
    ) => zip_(fa, fb),
    unit: <S>() => (s: S) => F.map_(F.unit(), () => [undefined, s])
  });
}
