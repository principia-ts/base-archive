import type { Either } from './data/Either'
import type { Predicate, Refinement } from './data/Function'
import type { Option } from './data/Option'
import type * as HKT from './HKT'

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
