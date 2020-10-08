import type { Either } from "../Either";
import { isLeft } from "../Either";
import type { Predicate, PredicateWithIndex, Refinement, RefinementWithIndex } from "../Function";
import type { Option } from "../Option";
import type * as TC from "../typeclass-index";
import type { Separated } from "../Utils";
import type { URI, V } from "./Map";

interface Next<A> {
   readonly done?: boolean;
   readonly value: A;
}

/**
 * @category Compactable
 * @since 1.0.0
 */
export const compact = <K, A>(fa: ReadonlyMap<K, Option<A>>): ReadonlyMap<K, A> => {
   const m = new Map<K, A>();
   const entries = fa.entries();
   let e: Next<readonly [K, Option<A>]>;
   while (!(e = entries.next()).done) {
      const [k, oa] = e.value;
      if (oa._tag === "Some") {
         m.set(k, oa.value);
      }
   }
   return m;
};

/**
 * @category Compactable
 * @since 1.0.0
 */
export const separate = <K, A, B>(
   fa: ReadonlyMap<K, Either<A, B>>
): Separated<ReadonlyMap<K, A>, ReadonlyMap<K, B>> => {
   const left = new Map<K, A>();
   const right = new Map<K, B>();
   const entries = fa.entries();
   let e: Next<readonly [K, Either<A, B>]>;
   // tslint:disable-next-line: strict-boolean-expressions
   while (!(e = entries.next()).done) {
      const [k, ei] = e.value;
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

/**
 * Test whether or not a map is empty
 */
export const isEmpty = <K, A>(d: ReadonlyMap<K, A>): boolean => d.size === 0;

/**
 * Maps values using f
 */
export const mapWithIndex_ = <K, A, B>(fa: ReadonlyMap<K, A>, f: (k: K, a: A) => B): ReadonlyMap<K, B> => {
   const m = new Map<K, B>();
   const entries = fa.entries();
   let e: Next<readonly [K, A]>;
   while (!(e = entries.next()).done) {
      const [key, a] = e.value;
      m.set(key, f(key, a));
   }
   return m;
};

/**
 * Maps values using f
 */
export const mapWithIndex = <K, A, B>(f: (k: K, a: A) => B) => (fa: ReadonlyMap<K, A>): ReadonlyMap<K, B> =>
   mapWithIndex_(fa, f);

/**
 * Maps values using f
 */
export const map_ = <K, A, B>(fa: ReadonlyMap<K, A>, f: (a: A) => B): ReadonlyMap<K, B> =>
   mapWithIndex_(fa, (_, a) => f(a));

/**
 * Maps values using f
 */
export const map = <A, B>(f: (a: A) => B) => <K>(fa: ReadonlyMap<K, A>): ReadonlyMap<K, B> => map_(fa, f);

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

export const mapEitherWithIndex: TC.MapEitherWithIndexF<[URI], V> = <K, A, B, C>(f: (k: K, a: A) => Either<B, C>) => (
   fa: ReadonlyMap<K, A>
): Separated<ReadonlyMap<K, B>, ReadonlyMap<K, C>> => mapEitherWithIndex_(fa, f);

export const mapEither_ = <K, A, B, C>(
   fa: ReadonlyMap<K, A>,
   f: (a: A) => Either<B, C>
): Separated<ReadonlyMap<K, B>, ReadonlyMap<K, C>> => mapEitherWithIndex_(fa, (_, a) => f(a));

export const mapEither = <A, B, C>(f: (a: A) => Either<B, C>) => <K>(
   fa: ReadonlyMap<K, A>
): Separated<ReadonlyMap<K, B>, ReadonlyMap<K, C>> => mapEither_(fa, f);
