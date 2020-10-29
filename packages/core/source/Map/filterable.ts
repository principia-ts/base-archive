import type * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";
import type { Separated } from "@principia/prelude/Utils";

import type { Either } from "../Either";
import { isLeft } from "../Either";
import type { Predicate, PredicateWithIndex, Refinement, RefinementWithIndex } from "../Function";
import type { Option } from "../Option";
import { Functor } from "./functor";
import type { URI, V } from "./model";

interface Next<A> {
   readonly done?: boolean;
   readonly value: A;
}

/*
 * -------------------------------------------
 * Filterable Map
 * -------------------------------------------
 */

/**
 * Filter out `None` and map
 */
export const mapOptionWithIndex_ = <K, A, B>(
   fa: ReadonlyMap<K, A>,
   f: (k: K, a: A) => Option<B>
): ReadonlyMap<K, B> => {
   const m = new Map<K, B>();
   const entries = fa.entries();
   let e: Next<readonly [K, A]>;
   while (!(e = entries.next()).done) {
      const [k, a] = e.value;
      const o = f(k, a);
      if (o._tag === "Some") {
         m.set(k, o.value);
      }
   }
   return m;
};

/**
 * Filter out `None` and map
 */
export const mapOptionWithIndex = <K, A, B>(f: (k: K, a: A) => Option<B>) => (
   fa: ReadonlyMap<K, A>
): ReadonlyMap<K, B> => mapOptionWithIndex_(fa, f);

/**
 * Filter out `None` and map
 */
export const mapOption_ = <K, A, B>(fa: ReadonlyMap<K, A>, f: (a: A) => Option<B>): ReadonlyMap<K, B> =>
   mapOptionWithIndex_(fa, (_, a) => f(a));

/**
 * Filter out `None` and map
 */
export const mapOption = <A, B>(f: (a: A) => Option<B>) => <K>(fa: ReadonlyMap<K, A>): ReadonlyMap<K, B> =>
   mapOption_(fa, f);

export const filterWithIndex_: {
   <K, A, B extends A>(fa: ReadonlyMap<K, A>, refinement: RefinementWithIndex<K, A, B>): ReadonlyMap<K, B>;
   <K, A>(fa: ReadonlyMap<K, A>, predicate: PredicateWithIndex<K, A>): ReadonlyMap<K, A>;
} = <K, A>(fa: ReadonlyMap<K, A>, predicate: PredicateWithIndex<K, A>): ReadonlyMap<K, A> => {
   const m = new Map<K, A>();
   const entries = fa.entries();
   let e: Next<readonly [K, A]>;
   while (!(e = entries.next()).done) {
      const [k, a] = e.value;
      if (predicate(k, a)) {
         m.set(k, a);
      }
   }
   return m;
};

/**
 *
 */
export const filterWithIndex: {
   <K, A, B extends A>(refinement: RefinementWithIndex<K, A, B>): (fa: ReadonlyMap<K, A>) => ReadonlyMap<K, B>;
   <K, A>(predicate: PredicateWithIndex<K, A>): (fa: ReadonlyMap<K, A>) => ReadonlyMap<K, A>;
} = <K, A>(predicate: PredicateWithIndex<K, A>) => (fa: ReadonlyMap<K, A>) => filterWithIndex_(fa, predicate);

export const filter_: {
   <K, A, B extends A>(fa: ReadonlyMap<K, A>, refinement: Refinement<A, B>): ReadonlyMap<K, B>;
   <K, A>(fa: ReadonlyMap<K, A>, predicate: Predicate<A>): ReadonlyMap<K, A>;
} = <K, A>(fa: ReadonlyMap<K, A>, predicate: Predicate<A>) => filterWithIndex_(fa, (_, a) => predicate(a));

export const filter: {
   <A, B extends A>(refinement: Refinement<A, B>): <K>(fa: ReadonlyMap<K, A>) => ReadonlyMap<K, B>;
   <A>(predicate: Predicate<A>): <K>(fa: ReadonlyMap<K, A>) => ReadonlyMap<K, A>;
} = <A>(predicate: Predicate<A>) => <K>(fa: ReadonlyMap<K, A>) => filter_(fa, predicate);

export const partitionWithIndex_: {
   <K, A, B extends A>(fa: ReadonlyMap<K, A>, refinement: RefinementWithIndex<K, A, B>): Separated<
      ReadonlyMap<K, A>,
      ReadonlyMap<K, B>
   >;
   <K, A>(fa: ReadonlyMap<K, A>, predicate: PredicateWithIndex<K, A>): Separated<ReadonlyMap<K, A>, ReadonlyMap<K, A>>;
} = <K, A>(
   fa: ReadonlyMap<K, A>,
   predicate: PredicateWithIndex<K, A>
): Separated<ReadonlyMap<K, A>, ReadonlyMap<K, A>> => {
   const left = new Map<K, A>();
   const right = new Map<K, A>();
   const entries = fa.entries();
   let e: Next<readonly [K, A]>;
   while (!(e = entries.next()).done) {
      const [k, a] = e.value;
      if (predicate(k, a)) {
         right.set(k, a);
      } else {
         left.set(k, a);
      }
   }
   return {
      left,
      right
   };
};

export const partitionWithIndex: {
   <K, A, B extends A>(refinement: RefinementWithIndex<K, A, B>): (
      fa: ReadonlyMap<K, A>
   ) => Separated<ReadonlyMap<K, A>, ReadonlyMap<K, B>>;
   <K, A>(predicate: PredicateWithIndex<K, A>): (
      fa: ReadonlyMap<K, A>
   ) => Separated<ReadonlyMap<K, A>, ReadonlyMap<K, A>>;
} = <K, A>(predicate: PredicateWithIndex<K, A>) => (fa: ReadonlyMap<K, A>) => partitionWithIndex_(fa, predicate);

export const partition_: {
   <K, A, B extends A>(fa: ReadonlyMap<K, A>, refinement: Refinement<A, B>): Separated<
      ReadonlyMap<K, A>,
      ReadonlyMap<K, B>
   >;
   <K, A>(fa: ReadonlyMap<K, A>, predicate: Predicate<A>): Separated<ReadonlyMap<K, A>, ReadonlyMap<K, A>>;
} = <K, A>(fa: ReadonlyMap<K, A>, predicate: Predicate<A>) => partitionWithIndex_(fa, (_, a) => predicate(a));

export const partition: {
   <A, B extends A>(refinement: Refinement<A, B>): <K>(
      fa: ReadonlyMap<K, A>
   ) => Separated<ReadonlyMap<K, A>, ReadonlyMap<K, B>>;
   <A>(predicate: Predicate<A>): <K>(fa: ReadonlyMap<K, A>) => Separated<ReadonlyMap<K, A>, ReadonlyMap<K, A>>;
} = <A>(predicate: Predicate<A>) => <K>(fa: ReadonlyMap<K, A>) => partition_(fa, predicate);

export const mapEitherWithIndex_ = <K, A, B, C>(
   fa: ReadonlyMap<K, A>,
   f: (k: K, a: A) => Either<B, C>
): Separated<ReadonlyMap<K, B>, ReadonlyMap<K, C>> => {
   const left = new Map<K, B>();
   const right = new Map<K, C>();
   const entries = fa.entries();
   let e: Next<readonly [K, A]>;
   while (!(e = entries.next()).done) {
      const [k, a] = e.value;
      const ei = f(k, a);
      if (isLeft(ei)) {
         left.set(k, ei.left);
      } else {
         right.set(k, ei.right);
      }
   }
   return {
      left,
      right
   };
};

export const mapEitherWithIndex = <K, A, B, C>(f: (k: K, a: A) => Either<B, C>) => (
   fa: ReadonlyMap<K, A>
): Separated<ReadonlyMap<K, B>, ReadonlyMap<K, C>> => mapEitherWithIndex_(fa, f);

export const mapEither_ = <K, A, B, C>(
   fa: ReadonlyMap<K, A>,
   f: (a: A) => Either<B, C>
): Separated<ReadonlyMap<K, B>, ReadonlyMap<K, C>> => mapEitherWithIndex_(fa, (_, a) => f(a));

export const mapEither = <A, B, C>(f: (a: A) => Either<B, C>) => <K>(
   fa: ReadonlyMap<K, A>
): Separated<ReadonlyMap<K, B>, ReadonlyMap<K, C>> => mapEither_(fa, f);

/**
 * @category Instances
 * @since 1.0.0
 */
export const Filterable: P.Filterable<[URI], V> = HKT.instance({
   ...Functor,
   filter_,
   mapOption_,
   partition_,
   mapEither_,
   filter,
   mapOption,
   partition,
   mapEither
});

/**
 * @category Instances
 * @since 1.0.0
 */
export const getFilterableWithIndex = <K = never>(): P.FilterableWithIndex<[URI], V & HKT.Fix<"K", K>> =>
   HKT.instance({
      mapOptionWithIndex_,
      filterWithIndex_,
      mapEitherWithIndex_,
      partitionWithIndex_,
      filterWithIndex,
      mapOptionWithIndex,
      partitionWithIndex,
      mapEitherWithIndex
   });
