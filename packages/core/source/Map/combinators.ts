import type { Eq } from "../Eq";
import { pipe } from "../Function";
import type { Option } from "../Option";
import * as O from "../Option";
import type { Ord } from "../Ord";
import { toNumber } from "../Ordering";

interface Next<A> {
   readonly done?: boolean;
   readonly value: A;
}

/**
 * Get a sorted array of the keys contained in a map
 *
 * @since 2.5.0
 */
export const keys = <K>(O: Ord<K>) => <A>(m: ReadonlyMap<K, A>): ReadonlyArray<K> =>
   Array.from(m.keys()).sort((a, b) => toNumber(O.compare(a)(b)));

export const lookupWithKey_ = <K>(E: Eq<K>) => <A>(m: ReadonlyMap<K, A>, k: K): Option<readonly [K, A]> => {
   const entries = m.entries();
   let e: Next<readonly [K, A]>;
   while (!(e = entries.next()).done) {
      const [ka, a] = e.value;
      if (E.equals(ka)(k)) {
         return O.some([ka, a]);
      }
   }
   return O.none();
};

export const lookupWithKey = <K>(E: Eq<K>) => {
   const lookupWithKeyE_ = lookupWithKey_(E);
   return (k: K) => <A>(m: ReadonlyMap<K, A>) => lookupWithKeyE_(m, k);
};

/**
 * Calculate the number of key/value pairs in a map
 */
export const size = <K, A>(d: Map<K, A>) => d.size;

export const lookup_ = <K>(E: Eq<K>) => {
   const lookupWithKeyE_ = lookupWithKey_(E);
   return <A>(m: ReadonlyMap<K, A>, k: K) =>
      pipe(
         lookupWithKeyE_(m, k),
         O.map(([_, a]) => a)
      );
};

export const lookup = <K>(E: Eq<K>) => {
   const lookupE_ = lookup_(E);
   return (k: K) => <A>(m: ReadonlyMap<K, A>) => lookupE_(m, k);
};

export const insertAt_ = <K>(E: Eq<K>) => {
   const lookupWithKeyE_ = lookupWithKey_(E);
   return <A>(m: ReadonlyMap<K, A>, k: K, a: A) => {
      const found = lookupWithKeyE_(m, k);
      if (O.isNone(found)) {
         const r = new Map(m);
         r.set(k, a);
         return r;
      } else if (found.value[1] !== a) {
         const r = new Map(m);
         r.set(found.value[0], a);
         return r;
      }
      return m;
   };
};

export const insertAt = <K>(E: Eq<K>) => {
   const insertAtE_ = insertAt_(E);
   return <A>(k: K, a: A) => (m: ReadonlyMap<K, A>) => insertAtE_(m, k, a);
};

export const copy = <K, V>(me: ReadonlyMap<K, V>) => {
   const m = new Map<K, V>();

   me.forEach((v, k) => {
      m.set(k, v);
   });

   return m;
};

export const insert_ = <K, V>(me: ReadonlyMap<K, V>, k: K, v: V): ReadonlyMap<K, V> => {
   const m = copy<K, V>(me);

   m.set(k, v);

   return m;
};

export const insert = <K, V>(k: K, v: V) => (me: ReadonlyMap<K, V>) => insert_(me, k, v);

export const remove = <K>(k: K) => <V>(me: ReadonlyMap<K, V>): ReadonlyMap<K, V> => {
   const m = copy(me);

   m.delete(k);

   return m;
};

export const deleteAt_ = <K>(E: Eq<K>) => {
   const lookupWithKeyE_ = lookupWithKey_(E);
   return <A>(m: ReadonlyMap<K, A>, k: K) => {
      const found = lookupWithKeyE_(m, k);
      if (O.isSome(found)) {
         const r = new Map(m);
         r.delete(found.value[0]);
         return r;
      }
      return m;
   };
};

export const deleteAt = <K>(E: Eq<K>) => {
   const deleteAtE_ = deleteAt_(E);
   return (k: K) => <A>(m: ReadonlyMap<K, A>) => deleteAtE_(m, k);
};

export const updateAt_ = <K>(E: Eq<K>) => {
   const lookupWithKeyE_ = lookupWithKey_(E);
   return <A>(m: ReadonlyMap<K, A>, k: K, a: A): Option<ReadonlyMap<K, A>> => {
      const found = lookupWithKeyE_(m, k);
      if (O.isNone(found)) {
         return O.none();
      }
      const r = new Map(m);
      r.set(found.value[0], a);
      return O.some(r);
   };
};

export const updateAt = <K>(E: Eq<K>) => {
   const updateAtE_ = updateAt_(E);
   return <A>(k: K, a: A) => (m: ReadonlyMap<K, A>) => updateAtE_(m, k, a);
};

export const modifyAt_ = <K>(E: Eq<K>) => {
   const lookupWithKeyE_ = lookupWithKey_(E);
   return <A>(m: ReadonlyMap<K, A>, k: K, f: (a: A) => A): Option<ReadonlyMap<K, A>> => {
      const found = lookupWithKeyE_(m, k);
      if (O.isNone(found)) {
         return O.none();
      }
      const r = new Map(m);
      r.set(found.value[0], f(found.value[1]));
      return O.some(r);
   };
};

export const modifyAt = <K>(E: Eq<K>) => {
   const modifyAtE_ = modifyAt_(E);
   return <A>(k: K, f: (a: A) => A) => (m: ReadonlyMap<K, A>) => modifyAtE_(m, k, f);
};

export const pop_ = <K>(E: Eq<K>) => {
   const lookupE_ = lookup_(E);
   const deleteAtE_ = deleteAt_(E);
   return <A>(m: ReadonlyMap<K, A>, k: K): Option<readonly [A, ReadonlyMap<K, A>]> =>
      pipe(
         lookupE_(m, k),
         O.map((a) => [a, deleteAtE_(m, k)])
      );
};

export const pop = <K>(E: Eq<K>) => {
   const popE_ = pop_(E);
   return (k: K) => <A>(m: ReadonlyMap<K, A>) => popE_(m, k);
};
