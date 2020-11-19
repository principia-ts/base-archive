import type { Apply } from "@principia/prelude/Apply";
import type { Chain } from "@principia/prelude/Chain";
import type { Eq } from "@principia/prelude/Eq";
import type { FunctionN } from "@principia/prelude/Function";
import type * as HKT from "@principia/prelude/HKT";

export const ChainLaws = {
  associativity: <F, A, B, C>(
    F: Chain<HKT.UHKT<F>>,
    S: Eq<HKT.HKT<F, C>>,
    afb: FunctionN<[A], HKT.HKT<F, B>>,
    bfc: FunctionN<[B], HKT.HKT<F, C>>
  ) => (fa: HKT.HKT<F, A>): boolean => {
    return S.equals_(
      F.chain_(F.chain_(fa, afb), bfc),
      F.chain_(fa, (a) => F.chain_(afb(a), bfc))
    );
  },
  derivedAp: <F, A, B>(
    F: Chain<HKT.UHKT<F>> & Apply<HKT.UHKT<F>>,
    S: Eq<HKT.HKT<F, B>>,
    fab: HKT.HKT<F, FunctionN<[A], B>>
  ) => (fa: HKT.HKT<F, A>): boolean => {
    return S.equals_(
      F.ap_(fab, fa),
      F.chain_(fab, (f) => F.map_(fa, f))
    );
  }
};
