import { getApplicativeComposition } from "../Applicative";
import * as E from "../Either";
import type { Either } from "../Either/Either";
import { identity, pipe } from "../Function";
import * as HKT from "../HKT";
import type { UC_ChainFComposition } from "../Monad";
import type * as TC from "../typeclass-index";

export type V<C> = HKT.CleanParam<C, "E"> & HKT.V<"E", "+">;

export function Monad<F extends HKT.URIS, C = HKT.Auto>(M: TC.Monad<F, C>): TC.Monad<HKT.AppendURI<F, E.URI>, V<C>>;
export function Monad<F>(M: TC.Monad<HKT.UHKT<F>>): TC.Monad<HKT.AppendURI<HKT.UHKT<F>, E.URI>, HKT.V<"E", "+">> {
   const chain_: UC_ChainFComposition<HKT.UHKT<F>, [E.URI], HKT.Auto, E.V> = (fga, f) =>
      M.chain_(
         fga,
         E.fold(
            (e) => M.pure(pipe(E.left(e), E.widenE<any>())),
            (a) => pipe(f(a), M.map(E.widenE<any>()))
         )
      );

   return HKT.instance({
      ...getApplicativeComposition(M, E.Applicative),
      chain_: chain_,
      chain: <A, E1, B>(f: (a: A) => HKT.HKT<F, Either<E1, B>>) => <E>(fa: HKT.HKT<F, Either<E, A>>) => chain_(fa, f),
      flatten: (mma) => chain_(mma, identity)
   });
}
