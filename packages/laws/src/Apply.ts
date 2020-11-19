import type { Apply } from "@principia/prelude/Apply";
import type { Eq } from "@principia/prelude/Eq";
import type { FunctionN } from "@principia/prelude/Function";
import type * as HKT from "@principia/prelude/HKT";

export const ApplyLaws = {
  associativeComposition: <F, A, B, C>(F: Apply<HKT.UHKT<F>>, S: Eq<HKT.HKT<F, C>>) => (
    fa: HKT.HKT<F, A>,
    fab: HKT.HKT<F, FunctionN<[A], B>>,
    fbc: HKT.HKT<F, FunctionN<[B], C>>
  ): boolean => {
    return S.equals_(
      F.ap_(
        F.ap_(
          F.map_(fbc, (bc) => (ab: FunctionN<[A], B>) => (a: A) => bc(ab(a))),
          fab
        ),
        fa
      ),
      F.ap_(fbc, F.ap_(fab, fa))
    );
  }
};
