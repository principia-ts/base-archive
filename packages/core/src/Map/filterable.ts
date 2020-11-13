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
export function mapOptionWithIndex_<K, A, B>(fa: ReadonlyMap<K, A>, f: (k: K, a: A) => Option<B>): ReadonlyMap<K, B> {
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
}

/**
 * Filter out `None` and map
 */
export function mapOptionWithIndex<K, A, B>(
   f: (k: K, a: A) => Option<B>
): (fa: ReadonlyMap<K, A>) => ReadonlyMap<K, B> {
   return (fa) => mapOptionWithIndex_(fa, f);
}

/**
 * Filter out `None` and map
 */
export function mapOption_<K, A, B>(fa: ReadonlyMap<K, A>, f: (a: A) => Option<B>): ReadonlyMap<K, B> {
   return mapOptionWithIndex_(fa, (_, a) => f(a));
}

/**
 * Filter out `None` and map
 */
export function mapOption<A, B>(f: (a: A) => Option<B>): <K>(fa: ReadonlyMap<K, A>) => ReadonlyMap<K, B> {
   return (fa) => mapOption_(fa, f);
}

export function filterWithIndex_<K, A, B extends A>(
   fa: ReadonlyMap<K, A>,
   refinement: RefinementWithIndex<K, A, B>
): ReadonlyMap<K, B>;
export function filterWithIndex_<K, A>(fa: ReadonlyMap<K, A>, predicate: PredicateWithIndex<K, A>): ReadonlyMap<K, A>;
export function filterWithIndex_<K, A>(fa: ReadonlyMap<K, A>, predicate: PredicateWithIndex<K, A>): ReadonlyMap<K, A> {
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
}

/**
 *
 */
export function filterWithIndex<K, A, B extends A>(
   refinement: RefinementWithIndex<K, A, B>
): (fa: ReadonlyMap<K, A>) => ReadonlyMap<K, B>;
export function filterWithIndex<K, A>(
   predicate: PredicateWithIndex<K, A>
): (fa: ReadonlyMap<K, A>) => ReadonlyMap<K, A>;
export function filterWithIndex<K, A>(
   predicate: PredicateWithIndex<K, A>
): (fa: ReadonlyMap<K, A>) => ReadonlyMap<K, A> {
   return (fa) => filterWithIndex_(fa, predicate);
}

export function filter_<K, A, B extends A>(fa: ReadonlyMap<K, A>, refinement: Refinement<A, B>): ReadonlyMap<K, B>;
export function filter_<K, A>(fa: ReadonlyMap<K, A>, predicate: Predicate<A>): ReadonlyMap<K, A>;
export function filter_<K, A>(fa: ReadonlyMap<K, A>, predicate: Predicate<A>): ReadonlyMap<K, A> {
   return filterWithIndex_(fa, (_, a) => predicate(a));
}

export function filter<A, B extends A>(refinement: Refinement<A, B>): <K>(fa: ReadonlyMap<K, A>) => ReadonlyMap<K, B>;
export function filter<A>(predicate: Predicate<A>): <K>(fa: ReadonlyMap<K, A>) => ReadonlyMap<K, A>;
export function filter<A>(predicate: Predicate<A>): <K>(fa: ReadonlyMap<K, A>) => ReadonlyMap<K, A> {
   return (fa) => filter_(fa, predicate);
}

export function partitionWithIndex_<K, A, B extends A>(
   fa: ReadonlyMap<K, A>,
   refinement: RefinementWithIndex<K, A, B>
): Separated<ReadonlyMap<K, A>, ReadonlyMap<K, B>>;
export function partitionWithIndex_<K, A>(
   fa: ReadonlyMap<K, A>,
   predicate: PredicateWithIndex<K, A>
): Separated<ReadonlyMap<K, A>, ReadonlyMap<K, A>>;
export function partitionWithIndex_<K, A>(
   fa: ReadonlyMap<K, A>,
   predicate: PredicateWithIndex<K, A>
): Separated<ReadonlyMap<K, A>, ReadonlyMap<K, A>> {
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
}

export function partitionWithIndex<K, A, B extends A>(
   refinement: RefinementWithIndex<K, A, B>
): (fa: ReadonlyMap<K, A>) => Separated<ReadonlyMap<K, A>, ReadonlyMap<K, B>>;
export function partitionWithIndex<K, A>(
   predicate: PredicateWithIndex<K, A>
): (fa: ReadonlyMap<K, A>) => Separated<ReadonlyMap<K, A>, ReadonlyMap<K, A>>;
export function partitionWithIndex<K, A>(
   predicate: PredicateWithIndex<K, A>
): (fa: ReadonlyMap<K, A>) => Separated<ReadonlyMap<K, A>, ReadonlyMap<K, A>> {
   return (fa) => partitionWithIndex_(fa, predicate);
}

export function partition_<K, A, B extends A>(
   fa: ReadonlyMap<K, A>,
   refinement: Refinement<A, B>
): Separated<ReadonlyMap<K, A>, ReadonlyMap<K, B>>;
export function partition_<K, A>(
   fa: ReadonlyMap<K, A>,
   predicate: Predicate<A>
): Separated<ReadonlyMap<K, A>, ReadonlyMap<K, A>>;
export function partition_<K, A>(
   fa: ReadonlyMap<K, A>,
   predicate: Predicate<A>
): Separated<ReadonlyMap<K, A>, ReadonlyMap<K, A>> {
   return partitionWithIndex_(fa, (_, a) => predicate(a));
}

export function partition<A, B extends A>(
   refinement: Refinement<A, B>
): <K>(fa: ReadonlyMap<K, A>) => Separated<ReadonlyMap<K, A>, ReadonlyMap<K, B>>;
export function partition<A>(
   predicate: Predicate<A>
): <K>(fa: ReadonlyMap<K, A>) => Separated<ReadonlyMap<K, A>, ReadonlyMap<K, A>>;
export function partition<A>(
   predicate: Predicate<A>
): <K>(fa: ReadonlyMap<K, A>) => Separated<ReadonlyMap<K, A>, ReadonlyMap<K, A>> {
   return (fa) => partition_(fa, predicate);
}

export function mapEitherWithIndex_<K, A, B, C>(
   fa: ReadonlyMap<K, A>,
   f: (k: K, a: A) => Either<B, C>
): Separated<ReadonlyMap<K, B>, ReadonlyMap<K, C>> {
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
}

export function mapEitherWithIndex<K, A, B, C>(
   f: (k: K, a: A) => Either<B, C>
): (fa: ReadonlyMap<K, A>) => Separated<ReadonlyMap<K, B>, ReadonlyMap<K, C>> {
   return (fa) => mapEitherWithIndex_(fa, f);
}

export function mapEither_<K, A, B, C>(
   fa: ReadonlyMap<K, A>,
   f: (a: A) => Either<B, C>
): Separated<ReadonlyMap<K, B>, ReadonlyMap<K, C>> {
   return mapEitherWithIndex_(fa, (_, a) => f(a));
}

export function mapEither<A, B, C>(
   f: (a: A) => Either<B, C>
): <K>(fa: ReadonlyMap<K, A>) => Separated<ReadonlyMap<K, B>, ReadonlyMap<K, C>> {
   return (fa) => mapEither_(fa, f);
}

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
export function getFilterableWithIndex<K = never>(): P.FilterableWithIndex<[URI], V & HKT.Fix<"K", K>> {
   return HKT.instance({
      mapOptionWithIndex_,
      filterWithIndex_,
      mapEitherWithIndex_,
      partitionWithIndex_,
      filterWithIndex,
      mapOptionWithIndex,
      partitionWithIndex,
      mapEitherWithIndex
   });
}
