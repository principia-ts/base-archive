import type * as P from "@principia/prelude";
import * as HKT from "@principia/prelude/HKT";

import type { URI, V } from "./model";

interface Next<A> {
   readonly done?: boolean;
   readonly value: A;
}

/*
 * -------------------------------------------
 * Functor Map
 * -------------------------------------------
 */

/**
 * Maps values using f
 */
export function mapWithIndex_<K, A, B>(fa: ReadonlyMap<K, A>, f: (k: K, a: A) => B): ReadonlyMap<K, B> {
   const m = new Map<K, B>();
   const entries = fa.entries();
   let e: Next<readonly [K, A]>;
   while (!(e = entries.next()).done) {
      const [key, a] = e.value;
      m.set(key, f(key, a));
   }
   return m;
}

/**
 * Maps values using f
 */
export function mapWithIndex<K, A, B>(f: (k: K, a: A) => B): (fa: ReadonlyMap<K, A>) => ReadonlyMap<K, B> {
   return (fa) => mapWithIndex_(fa, f);
}

/**
 * Maps values using f
 */
export function map_<K, A, B>(fa: ReadonlyMap<K, A>, f: (a: A) => B): ReadonlyMap<K, B> {
   return mapWithIndex_(fa, (_, a) => f(a));
}

/**
 * Maps values using f
 */
export function map<A, B>(f: (a: A) => B): <K>(fa: ReadonlyMap<K, A>) => ReadonlyMap<K, B> {
   return (fa) => map_(fa, f);
}

/**
 * @category Functor
 * @since 1.0.0
 */
export const Functor: P.Functor<[URI], V> = HKT.instance({
   map,
   map_: map_
});

/**
 * @category FunctorWithIndex
 * @since 1.0.0
 */
export const FunctorWithIndex: P.FunctorWithIndex<[URI], V> = HKT.instance({
   mapWithIndex,
   mapWithIndex_: mapWithIndex_
});
