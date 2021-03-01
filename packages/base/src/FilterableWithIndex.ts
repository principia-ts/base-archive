import type { Either } from './Either'
import type { PredicateWithIndex, RefinementWithIndex } from './Function'
import type * as HKT from './HKT'
import type { Option } from './Option'

export interface FilterableWithIndex<F extends HKT.URIS, C = HKT.Auto> extends HKT.Base<F, C> {
  readonly ipartitionMap_: PartitionMapWithIndexFn_<F, C>
  readonly ipartition_: PartitionWithIndexFn_<F, C>
  readonly ifilterMap_: FilterMapWithIndexFn_<F, C>
  readonly ifilter_: FilterWithIndexFn_<F, C>
  readonly ipartitionMap: PartitionMapWithIndexFn<F, C>
  readonly ipartition: PartitionWithIndexFn<F, C>
  readonly ifilterMap: FilterMapWithIndexFn<F, C>
  readonly ifilter: FilterWithIndexFn<F, C>
}

export interface FilterWithIndexFn<F extends HKT.URIS, C = HKT.Auto> {
  <N extends string, K, A, B extends A>(
    refinement: RefinementWithIndex<HKT.IndexFor<F, HKT.OrFix<'N', C, N>, HKT.OrFix<'K', C, K>>, A, B>
  ): <Q, W, X, I, S, R, E>(
    fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>
  ) => HKT.Kind<F, C, string, K, Q, W, X, I, S, R, E, B>
  <N extends string, K, A>(
    predicate: PredicateWithIndex<HKT.IndexFor<F, HKT.OrFix<'N', C, N>, HKT.OrFix<'K', C, K>>, A>
  ): <Q, W, X, I, S, R, E>(
    fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>
  ) => HKT.Kind<F, C, string, K, Q, W, X, I, S, R, E, A>
}

export interface FilterWithIndexFn_<F extends HKT.URIS, C = HKT.Auto> {
  <N extends string, K, Q, W, X, I, S, R, E, A, B extends A>(
    fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>,
    refinement: RefinementWithIndex<HKT.IndexFor<F, HKT.OrFix<'N', C, N>, HKT.OrFix<'K', C, K>>, A, B>
  ): HKT.Kind<F, C, string, K, Q, W, X, I, S, R, E, B>
  <N extends string, K, Q, W, X, I, S, R, E, A>(
    fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>,
    predicate: PredicateWithIndex<HKT.IndexFor<F, HKT.OrFix<'N', C, N>, HKT.OrFix<'K', C, K>>, A>
  ): HKT.Kind<F, C, string, K, Q, W, X, I, S, R, E, A>
}

export interface FilterMapWithIndexFn<F extends HKT.URIS, C = HKT.Auto> {
  <N extends string, K, A, B>(f: (i: HKT.IndexFor<F, HKT.OrFix<'N', C, N>, HKT.OrFix<'K', C, K>>, a: A) => Option<B>): <
    Q,
    W,
    X,
    I,
    S,
    R,
    E
  >(
    fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>
  ) => HKT.Kind<F, C, string, K, Q, W, X, I, S, R, E, B>
}

export interface FilterMapWithIndexFn_<F extends HKT.URIS, C = HKT.Auto> {
  <N extends string, K, Q, W, X, I, S, R, E, A, B>(
    fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>,
    f: (i: HKT.IndexFor<F, HKT.OrFix<'N', C, N>, HKT.OrFix<'K', C, K>>, a: A) => Option<B>
  ): HKT.Kind<F, C, string, K, Q, W, X, I, S, R, E, B>
}

export interface PartitionMapWithIndexFn<F extends HKT.URIS, C = HKT.Auto> {
  <N extends string, K, A, B, B1>(
    f: (i: HKT.IndexFor<F, HKT.OrFix<'N', C, N>, HKT.OrFix<'K', C, K>>, a: A) => Either<B, B1>
  ): <Q, W, X, I, S, R, E>(
    fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>
  ) => readonly [HKT.Kind<F, C, string, K, Q, W, X, I, S, R, E, B>, HKT.Kind<F, C, string, K, Q, W, X, I, S, R, E, B1>]
}

export interface PartitionMapWithIndexFn_<F extends HKT.URIS, C = HKT.Auto> {
  <N extends string, K, Q, W, X, I, S, R, E, A, B, B1>(
    fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>,
    f: (i: HKT.IndexFor<F, HKT.OrFix<'N', C, N>, HKT.OrFix<'K', C, K>>, a: A) => Either<B, B1>
  ): readonly [HKT.Kind<F, C, string, K, Q, W, X, I, S, R, E, B>, HKT.Kind<F, C, string, K, Q, W, X, I, S, R, E, B1>]
}

export interface PartitionWithIndexFn<F extends HKT.URIS, C = HKT.Auto> {
  <N extends string, K, A, B extends A>(
    refinement: RefinementWithIndex<HKT.IndexFor<F, HKT.OrFix<'N', C, N>, HKT.OrFix<'K', C, K>>, A, B>
  ): <Q, W, X, I, S, R, E>(
    fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>
  ) => readonly [HKT.Kind<F, C, string, K, Q, W, X, I, S, R, E, A>, HKT.Kind<F, C, string, K, Q, W, X, I, S, R, E, B>]
  <N extends string, K, A>(
    predicate: PredicateWithIndex<HKT.IndexFor<F, HKT.OrFix<'N', C, N>, HKT.OrFix<'K', C, K>>, A>
  ): <N extends string, K, Q, W, X, I, S, R, E>(
    fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>
  ) => readonly [HKT.Kind<F, C, string, K, Q, W, X, I, S, R, E, A>, HKT.Kind<F, C, string, K, Q, W, X, I, S, R, E, A>]
}

export interface PartitionWithIndexFn_<F extends HKT.URIS, C = HKT.Auto> {
  <N extends string, K, Q, W, X, I, S, R, E, A, B extends A>(
    fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>,
    refinement: RefinementWithIndex<HKT.IndexFor<F, HKT.OrFix<'N', C, N>, HKT.OrFix<'K', C, K>>, A, B>
  ): readonly [HKT.Kind<F, C, string, K, Q, W, X, I, S, R, E, A>, HKT.Kind<F, C, string, K, Q, W, X, I, S, R, E, B>]
  <N extends string, K, Q, W, X, I, S, R, E, A>(
    fa: HKT.Kind<F, C, N, K, Q, W, X, I, S, R, E, A>,
    predicate: PredicateWithIndex<HKT.IndexFor<F, HKT.OrFix<'N', C, N>, HKT.OrFix<'K', C, K>>, A>
  ): readonly [HKT.Kind<F, C, string, K, Q, W, X, I, S, R, E, A>, HKT.Kind<F, C, string, K, Q, W, X, I, S, R, E, A>]
}
