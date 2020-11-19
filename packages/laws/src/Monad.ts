import type { Chain } from "@principia/prelude/Chain";
import type { Eq } from "@principia/prelude/Eq";
import type { FunctionN } from "@principia/prelude/Function";
import type * as HKT from "@principia/prelude/HKT";
import type { Monad } from "@principia/prelude/Monad";

export const MonadLaws = {
  leftIdentity: <M, A, B>(
    M: Monad<HKT.UHKT<M>>,
    S: Eq<HKT.HKT<M, B>>,
    afb: FunctionN<[A], HKT.HKT<M, B>>
  ) => (a: A): boolean => {
    return S.equals_(
      M.flatten(
        M.map_(
          M.map_(M.unit(), () => a),
          afb
        )
      ),
      afb(a)
    );
  },
  rightIdentity: <M, A>(M: Monad<HKT.UHKT<M>>, S: Eq<HKT.HKT<M, A>>) => (
    fa: HKT.HKT<M, A>
  ): boolean => {
    return S.equals_(M.flatten(M.map_(fa, (a) => M.map_(M.unit(), () => a))), fa);
  },
  derivedMap: <M, A, B>(M: Monad<HKT.UHKT<M>>, S: Eq<HKT.HKT<M, B>>, ab: FunctionN<[A], B>) => (
    fa: HKT.HKT<M, A>
  ): boolean => {
    return S.equals_(M.map_(fa, ab), M.flatten(M.map_(fa, (a) => M.map_(M.unit(), () => ab(a)))));
  },
  derivedChain: <M, A, B>(
    M: Monad<HKT.UHKT<M>> & Chain<HKT.UHKT<M>>,
    S: Eq<HKT.HKT<M, B>>,
    afb: FunctionN<[A], HKT.HKT<M, B>>
  ) => (fa: HKT.HKT<M, A>): boolean => {
    return S.equals_(M.chain_(fa, afb), M.flatten(M.map_(fa, afb)));
  }
};
