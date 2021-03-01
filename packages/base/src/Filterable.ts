import type { Either } from './Either'
import type { Predicate, Refinement } from './Function'
import type { MonadExcept } from './MonadExcept'
import type { Monoid } from './Monoid'
import type { Option } from './Option'
import type { Erase } from './util/types'

import * as E from './Either'
import { flow, not, pipe, tuple } from './Function'
import * as HKT from './HKT'
import { attemptF } from './MonoidalExcept'
import * as O from './Option'

export interface Filterable<F extends HKT.URIS, C = HKT.Auto> extends HKT.Base<F, C> {
  readonly partitionMap_: PartitionMapFn_<F, C>
  readonly partitionMap: PartitionMapFn<F, C>
  readonly partition_: PartitionFn_<F, C>
  readonly partition: PartitionFn<F, C>
  readonly filterMap_: FilterMapFn_<F, C>
  readonly filterMap: FilterMapFn<F, C>
  readonly filter_: FilterFn_<F, C>
  readonly filter: FilterFn<F, C>
}

export interface FilterFn<F extends HKT.URIS, C = HKT.Auto> {
  <A, B extends A>(refinement: Refinement<A, B>): <N extends string, K, Q, W, X, I, S, R, E>(
    fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>
  ) => HKT.Kind<F, C, string, K, Q, W, X, I, S, R, E, B>
  <A>(predicate: Predicate<A>): <N extends string, K, Q, W, X, I, S, R, E>(
    fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>
  ) => HKT.Kind<F, C, string, K, Q, W, X, I, S, R, E, A>
}

export interface FilterFn_<F extends HKT.URIS, C = HKT.Auto> {
  <N extends string, K, Q, W, X, I, S, R, E, A, B extends A>(
    fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>,
    refinement: Refinement<A, B>
  ): HKT.Kind<F, C, string, K, Q, W, X, I, S, R, E, B>
  <N extends string, K, Q, W, X, I, S, R, E, A>(
    fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>,
    predicate: Predicate<A>
  ): HKT.Kind<F, C, string, K, Q, W, X, I, S, R, E, A>
}

export interface FilterMapFn<F extends HKT.URIS, C = HKT.Auto> {
  <A, B>(f: (a: A) => Option<B>): <N extends string, K, Q, W, X, I, S, R, E>(
    fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>
  ) => HKT.Kind<F, C, string, K, Q, W, X, I, S, R, E, B>
}

export interface FilterMapFn_<F extends HKT.URIS, C = HKT.Auto> {
  <N extends string, K, Q, W, X, I, S, R, E, A, B>(
    fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>,
    f: (a: A) => Option<B>
  ): HKT.Kind<F, C, string, K, Q, W, X, I, S, R, E, B>
}

export interface PartitionFn<F extends HKT.URIS, C = HKT.Auto> {
  <A, B extends A>(refinement: Refinement<A, B>): <N extends string, K, Q, W, X, I, S, R, E>(
    fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>
  ) => readonly [HKT.Kind<F, C, string, K, Q, W, X, I, S, R, E, A>, HKT.Kind<F, C, string, K, Q, W, X, I, S, R, E, B>]
  <A>(predicate: Predicate<A>): <N extends string, K, Q, W, X, I, S, R, E>(
    fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>
  ) => readonly [HKT.Kind<F, C, string, K, Q, W, X, I, S, R, E, A>, HKT.Kind<F, C, string, K, Q, W, X, I, S, R, E, A>]
}

export interface PartitionFn_<F extends HKT.URIS, C = HKT.Auto> {
  <N extends string, K, Q, W, X, I, S, R, E, A, B extends A>(
    fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>,
    refinement: Refinement<A, B>
  ): readonly [HKT.Kind<F, C, string, K, Q, W, X, I, S, R, E, A>, HKT.Kind<F, C, string, K, Q, W, X, I, S, R, E, B>]
  <N extends string, K, Q, W, X, I, S, R, E, A>(
    fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>,
    predicate: Predicate<A>
  ): readonly [HKT.Kind<F, C, string, K, Q, W, X, I, S, R, E, A>, HKT.Kind<F, C, string, K, Q, W, X, I, S, R, E, A>]
}

export interface PartitionMapFn<F extends HKT.URIS, C = HKT.Auto> {
  <A, B, B1>(f: (a: A) => Either<B, B1>): <N extends string, K, Q, W, X, I, S, R, E>(
    fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>
  ) => readonly [HKT.Kind<F, C, string, K, Q, W, X, I, S, R, E, B>, HKT.Kind<F, C, string, K, Q, W, X, I, S, R, E, B1>]
}

export interface PartitionMapFn_<F extends HKT.URIS, C = HKT.Auto> {
  <N extends string, K, Q, W, X, I, S, R, E, A, B, B1>(
    fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>,
    f: (a: A) => Either<B, B1>
  ): readonly [HKT.Kind<F, C, string, K, Q, W, X, I, S, R, E, B>, HKT.Kind<F, C, string, K, Q, W, X, I, S, R, E, B1>]
}

export function getFilterable<F extends HKT.URIS, C = HKT.Auto>(
  F: MonadExcept<F, C>
): <E>(M: Monoid<E>) => Filterable<F, Erase<HKT.Strip<C, 'E'>, HKT.Auto> & HKT.Fix<'E', E>>
export function getFilterable<F>(
  F: MonadExcept<HKT.UHKT2<F>>
): <E>(M: Monoid<E>) => Filterable<HKT.UHKT2<F>, HKT.Fix<'E', E>> {
  const attempt = attemptF(F)
  return <E>(M: Monoid<E>) => {
    const empty = F.fail(M.nat)

    const filterMap_: FilterMapFn_<HKT.UHKT2<F>, HKT.Fix<'E', E>>       = (fa, f) =>
      pipe(
        attempt(fa),
        F.bind(
          E.match(
            F.fail,
            flow(
              f,
              O.match(() => empty, F.pure)
            )
          )
        )
      )
    const partitionMap_: PartitionMapFn_<HKT.UHKT2<F>, HKT.Fix<'E', E>> = (fa, f) => [
      filterMap_(fa, flow(f, O.getLeft)),
      filterMap_(fa, flow(f, O.getRight))
    ]

    const filter_: FilterFn_<HKT.UHKT2<F>, HKT.Fix<'E', E>> = <A>(fa: HKT.HKT2<F, E, A>, predicate: Predicate<A>) =>
      pipe(attempt(fa), F.bind(E.match(F.fail, (a) => (predicate(a) ? F.pure(a) : empty))))

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
