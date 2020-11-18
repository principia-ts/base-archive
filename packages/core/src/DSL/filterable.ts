import type {
  Filterable,
  FilterFn_,
  MapEitherFn_,
  MapOptionFn_,
  Monad,
  Monoid,
  PartitionFn_,
  Predicate
} from "@principia/prelude";
import { chainF, flow, not, pureF } from "@principia/prelude";
import type { Applicative } from "@principia/prelude/Applicative";
import type { Fallible } from "@principia/prelude/Fallible";
import * as HKT from "@principia/prelude/HKT";
import type { Erase } from "@principia/prelude/Utils";

import * as E from "../Either";
import { pipe } from "../Function";
import * as O from "../Option";

export function getFilterableF<F extends HKT.URIS, C = HKT.Auto>(
  F: Monad<F, C> & Fallible<F, C> & Applicative<F, C>
): <E>(M: Monoid<E>) => Filterable<F, Erase<HKT.Strip<C, "E">, HKT.Auto> & HKT.Fix<"E", E>>;
export function getFilterableF<F>(
  F: Monad<HKT.UHKT2<F>> & Fallible<HKT.UHKT2<F>> & Applicative<HKT.UHKT2<F>>
): <E>(M: Monoid<E>) => Filterable<HKT.UHKT2<F>, HKT.Fix<"E", E>> {
  return <E>(M: Monoid<E>) => {
    const pure = pureF(F);
    const chain = chainF(F);
    const empty = F.fail(M.nat);

    const mapOption_: MapOptionFn_<HKT.UHKT2<F>, HKT.Fix<"E", E>> = (fa, f) =>
      pipe(
        F.recover(fa),
        chain(
          E.fold(
            F.fail,
            flow(
              f,
              O.fold(() => empty, pure)
            )
          )
        )
      );
    const mapEither_: MapEitherFn_<HKT.UHKT2<F>, HKT.Fix<"E", E>> = (fa, f) => ({
      left: mapOption_(fa, flow(f, O.getLeft)),
      right: mapOption_(fa, flow(f, O.getRight))
    });

    const filter_: FilterFn_<HKT.UHKT2<F>, HKT.Fix<"E", E>> = <A>(
      fa: HKT.HKT2<F, E, A>,
      predicate: Predicate<A>
    ) => pipe(F.recover(fa), chain(E.fold(F.fail, (a) => (predicate(a) ? pure(a) : empty))));

    const partition_: PartitionFn_<HKT.UHKT2<F>, HKT.Fix<"E", E>> = <A>(
      fa: HKT.HKT2<F, E, A>,
      predicate: Predicate<A>
    ) => ({
      left: filter_(fa, not(predicate)),
      right: filter_(fa, predicate)
    });

    return HKT.instance<Filterable<HKT.UHKT2<F>, HKT.Fix<"E", E>>>({
      mapEither_,
      mapOption_,
      filter_,
      partition_,
      mapEither: (f) => (fa) => mapEither_(fa, f),
      mapOption: (f) => (fa) => mapOption_(fa, f),
      filter: <A>(predicate: Predicate<A>) => (fa: HKT.HKT2<F, E, A>) => filter_(fa, predicate),
      partition: <A>(predicate: Predicate<A>) => (fa: HKT.HKT2<F, E, A>) =>
        partition_(fa, predicate)
    });
  };
}
