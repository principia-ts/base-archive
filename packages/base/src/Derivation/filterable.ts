import type { Predicate } from '../Function'
import type {
  Filterable,
  FilterFn_,
  FilterMapFn_,
  MonadExcept,
  Monoid,
  PartitionFn_,
  PartitionMapFn_
} from '../typeclass'
import type { Erase } from '../util/types'

import * as E from '../Either'
import { flow, not, pipe, tuple } from '../Function'
import * as HKT from '../HKT'
import * as O from '../Option'

export function getFilterable<F extends HKT.URIS, C = HKT.Auto>(
  F: MonadExcept<F, C>
): <E>(M: Monoid<E>) => Filterable<F, Erase<HKT.Strip<C, 'E'>, HKT.Auto> & HKT.Fix<'E', E>>
export function getFilterable<F>(
  F: MonadExcept<HKT.UHKT2<F>>
): <E>(M: Monoid<E>) => Filterable<HKT.UHKT2<F>, HKT.Fix<'E', E>> {
  return <E>(M: Monoid<E>) => {
    const empty = F.fail(M.nat)

    const filterMap_: FilterMapFn_<HKT.UHKT2<F>, HKT.Fix<'E', E>>       = (fa, f) =>
      pipe(
        F.attempt(fa),
        F.bind(
          E.fold(
            F.fail,
            flow(
              f,
              O.fold(() => empty, F.pure)
            )
          )
        )
      )
    const partitionMap_: PartitionMapFn_<HKT.UHKT2<F>, HKT.Fix<'E', E>> = (fa, f) => [
      filterMap_(fa, flow(f, O.getLeft)),
      filterMap_(fa, flow(f, O.getRight))
    ]

    const filter_: FilterFn_<HKT.UHKT2<F>, HKT.Fix<'E', E>> = <A>(fa: HKT.HKT2<F, E, A>, predicate: Predicate<A>) =>
      pipe(F.attempt(fa), F.bind(E.fold(F.fail, (a) => (predicate(a) ? F.pure(a) : empty))))

    const partition_: PartitionFn_<HKT.UHKT2<F>, HKT.Fix<'E', E>> = <A>(
      fa: HKT.HKT2<F, E, A>,
      predicate: Predicate<A>
    ) => tuple(filter_(fa, not(predicate)), filter_(fa, predicate))

    return HKT.instance<Filterable<HKT.UHKT2<F>, HKT.Fix<'E', E>>>({
      partitionMap_,
      filterMap_,
      filter_,
      partition_,
      partitionMap: (f) => (fa) => partitionMap_(fa, f),
      filterMap: (f) => (fa) => filterMap_(fa, f),
      filter: <A>(predicate: Predicate<A>) => (fa: HKT.HKT2<F, E, A>) => filter_(fa, predicate),
      partition: <A>(predicate: Predicate<A>) => (fa: HKT.HKT2<F, E, A>) => partition_(fa, predicate)
    })
  }
}
