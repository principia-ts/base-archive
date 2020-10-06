import { Either, isLeft } from "../Either";
import { Predicate, PredicateWithIndex, Refinement, RefinementWithIndex } from "../Function";
import { Maybe } from "../Maybe";
import type * as TC from "../typeclass-index";
import { Separated } from "../Utils";
import { URI, V } from "./Map";

interface Next<A> {
   readonly done?: boolean;
   readonly value: A;
}

/**
 * @category Compactable
 * @since 1.0.0
 */
export const compact = <K, A>(fa: ReadonlyMap<K, Maybe<A>>): ReadonlyMap<K, A> => {
   const m = new Map<K, A>();
   const entries = fa.entries();
   let e: Next<readonly [K, Maybe<A>]>;
   while (!(e = entries.next()).done) {
      const [k, oa] = e.value;
      if (oa._tag === "Just") {
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
 * Filter out `Nothing` and map
 */
export const _mapMaybeWithIndex = <K, A, B>(fa: ReadonlyMap<K, A>, f: (k: K, a: A) => Maybe<B>): ReadonlyMap<K, B> => {
   const m = new Map<K, B>();
   const entries = fa.entries();
   let e: Next<readonly [K, A]>;
   while (!(e = entries.next()).done) {
      const [k, a] = e.value;
      const o = f(k, a);
      if (o._tag === "Just") {
         m.set(k, o.value);
      }
   }
   return m;
};

/**
 * Filter out `Nothing` and map
 */
export const mapMaybeWithIndex = <K, A, B>(f: (k: K, a: A) => Maybe<B>) => (fa: ReadonlyMap<K, A>): ReadonlyMap<K, B> =>
   _mapMaybeWithIndex(fa, f);

/**
 * Filter out `Nothing` and map
 */
export const _mapMaybe = <K, A, B>(fa: ReadonlyMap<K, A>, f: (a: A) => Maybe<B>): ReadonlyMap<K, B> =>
   _mapMaybeWithIndex(fa, (_, a) => f(a));

/**
 * Filter out `Nothing` and map
 */
export const mapMaybe = <A, B>(f: (a: A) => Maybe<B>) => <K>(fa: ReadonlyMap<K, A>): ReadonlyMap<K, B> =>
   _mapMaybe(fa, f);

export const _filterWithIndex: {
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
} = <K, A>(predicate: PredicateWithIndex<K, A>) => (fa: ReadonlyMap<K, A>) => _filterWithIndex(fa, predicate);

export const _filter: {
   <K, A, B extends A>(fa: ReadonlyMap<K, A>, refinement: Refinement<A, B>): ReadonlyMap<K, B>;
   <K, A>(fa: ReadonlyMap<K, A>, predicate: Predicate<A>): ReadonlyMap<K, A>;
} = <K, A>(fa: ReadonlyMap<K, A>, predicate: Predicate<A>) => _filterWithIndex(fa, (_, a) => predicate(a));

export const filter: {
   <A, B extends A>(refinement: Refinement<A, B>): <K>(fa: ReadonlyMap<K, A>) => ReadonlyMap<K, B>;
   <A>(predicate: Predicate<A>): <K>(fa: ReadonlyMap<K, A>) => ReadonlyMap<K, A>;
} = <A>(predicate: Predicate<A>) => <K>(fa: ReadonlyMap<K, A>) => _filter(fa, predicate);

/**
 * Test whether or not a map is empty
 */
export const isEmpty = <K, A>(d: ReadonlyMap<K, A>): boolean => d.size === 0;

/**
 * Maps values using f
 */
export const _mapWithIndex = <K, A, B>(fa: ReadonlyMap<K, A>, f: (k: K, a: A) => B): ReadonlyMap<K, B> => {
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
   _mapWithIndex(fa, f);

/**
 * Maps values using f
 */
export const _map = <K, A, B>(fa: ReadonlyMap<K, A>, f: (a: A) => B): ReadonlyMap<K, B> =>
   _mapWithIndex(fa, (_, a) => f(a));

/**
 * Maps values using f
 */
export const map = <A, B>(f: (a: A) => B) => <K>(fa: ReadonlyMap<K, A>): ReadonlyMap<K, B> => _map(fa, f);

export const _partitionWithIndex: {
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
} = <K, A>(predicate: PredicateWithIndex<K, A>) => (fa: ReadonlyMap<K, A>) => _partitionWithIndex(fa, predicate);

export const _partition: {
   <K, A, B extends A>(fa: ReadonlyMap<K, A>, refinement: Refinement<A, B>): Separated<
      ReadonlyMap<K, A>,
      ReadonlyMap<K, B>
   >;
   <K, A>(fa: ReadonlyMap<K, A>, predicate: Predicate<A>): Separated<ReadonlyMap<K, A>, ReadonlyMap<K, A>>;
} = <K, A>(fa: ReadonlyMap<K, A>, predicate: Predicate<A>) => _partitionWithIndex(fa, (_, a) => predicate(a));

export const partition: {
   <A, B extends A>(refinement: Refinement<A, B>): <K>(
      fa: ReadonlyMap<K, A>
   ) => Separated<ReadonlyMap<K, A>, ReadonlyMap<K, B>>;
   <A>(predicate: Predicate<A>): <K>(fa: ReadonlyMap<K, A>) => Separated<ReadonlyMap<K, A>, ReadonlyMap<K, A>>;
} = <A>(predicate: Predicate<A>) => <K>(fa: ReadonlyMap<K, A>) => _partition(fa, predicate);

export const _mapEitherWithIndex = <K, A, B, C>(
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
): Separated<ReadonlyMap<K, B>, ReadonlyMap<K, C>> => _mapEitherWithIndex(fa, f);

export const _mapEither = <K, A, B, C>(
   fa: ReadonlyMap<K, A>,
   f: (a: A) => Either<B, C>
): Separated<ReadonlyMap<K, B>, ReadonlyMap<K, C>> => _mapEitherWithIndex(fa, (_, a) => f(a));

export const mapEither = <A, B, C>(f: (a: A) => Either<B, C>) => <K>(
   fa: ReadonlyMap<K, A>
): Separated<ReadonlyMap<K, B>, ReadonlyMap<K, C>> => _mapEither(fa, f);
