import { getApplicativeComposition } from "../Applicative";
import * as E from "../Either";
import { Either } from "../Either/Either";
import { identity, pipe } from "../Function";
import * as HKT from "../HKT";
import { UC_ChainFComposition } from "../Monad";
import * as TC from "../typeclass-index";

export type V<C> = HKT.CleanParam<C, "E"> & HKT.V<"E", "+">;

export function Monad<F extends HKT.URIS, C = HKT.Auto>(M: TC.Monad<F, C>): TC.Monad<HKT.AppendURI<F, E.URI>, V<C>>;
export function Monad<F>(M: TC.Monad<HKT.UHKT<F>>): TC.Monad<HKT.AppendURI<HKT.UHKT<F>, E.URI>, HKT.V<"E", "+">> {
   const _chain: UC_ChainFComposition<HKT.UHKT<F>, [E.URI], HKT.Auto, E.V> = (fga, f) =>
      M._chain(
         fga,
         E.fold(
            (e) => M.pure(pipe(E.left(e), E.widenE<any>())),
            (a) => pipe(f(a), M.map(E.widenE<any>()))
         )
      );

   return HKT.instance({
      ...getApplicativeComposition(M, E.Applicative),
      _chain,
      chain: <A, E1, B>(f: (a: A) => HKT.HKT<F, Either<E1, B>>) => <E>(fa: HKT.HKT<F, Either<E, A>>) => _chain(fa, f),
      flatten: (mma) => _chain(mma, identity)
   });
}
