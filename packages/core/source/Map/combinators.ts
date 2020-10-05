import type { Eq } from "../Eq";
import { pipe } from "../Function";
import type { Maybe } from "../Maybe";
import * as Mb from "../Maybe";
import { Ord } from "../Ord";
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

export const _lookupWithKey = <K>(E: Eq<K>) => <A>(
   m: ReadonlyMap<K, A>,
   k: K
): Maybe<readonly [K, A]> => {
   const entries = m.entries();
   let e: Next<readonly [K, A]>;
   while (!(e = entries.next()).done) {
      const [ka, a] = e.value;
      if (E.equals(ka)(k)) {
         return Mb.just([ka, a]);
      }
   }
   return Mb.nothing();
};

export const lookupWithKey = <K>(E: Eq<K>) => {
   const _lookupWithKeyE = _lookupWithKey(E);
   return (k: K) => <A>(m: ReadonlyMap<K, A>) => _lookupWithKeyE(m, k);
};

/**
 * Calculate the number of key/value pairs in a map
 */
export const size = <K, A>(d: Map<K, A>) => d.size;

export const _lookup = <K>(E: Eq<K>) => {
   const _lookupWithKeyE = _lookupWithKey(E);
   return <A>(m: ReadonlyMap<K, A>, k: K) =>
      pipe(
         _lookupWithKeyE(m, k),
         Mb.map(([_, a]) => a)
      );
};

export const lookup = <K>(E: Eq<K>) => {
   const _lookupE = _lookup(E);
   return (k: K) => <A>(m: ReadonlyMap<K, A>) => _lookupE(m, k);
};

export const _insertAt = <K>(E: Eq<K>) => {
   const _lookupWithKeyE = _lookupWithKey(E);
   return <A>(m: ReadonlyMap<K, A>, k: K, a: A) => {
      const found = _lookupWithKeyE(m, k);
      if (Mb.isNothing(found)) {
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
   const _insertAtE = _insertAt(E);
   return <A>(k: K, a: A) => (m: ReadonlyMap<K, A>) => _insertAtE(m, k, a);
};

export const copy = <K, V>(me: ReadonlyMap<K, V>) => {
   const m = new Map<K, V>();

   me.forEach((v, k) => {
      m.set(k, v);
   });

   return m;
};

export const _insert = <K, V>(me: ReadonlyMap<K, V>, k: K, v: V): ReadonlyMap<K, V> => {
   const m = copy<K, V>(me);

   m.set(k, v);

   return m;
};

export const insert = <K, V>(k: K, v: V) => (me: ReadonlyMap<K, V>) => _insert(me, k, v);

export const remove = <K>(k: K) => <V>(me: ReadonlyMap<K, V>): ReadonlyMap<K, V> => {
   const m = copy(me);

   m.delete(k);

   return m;
};

export const _deleteAt = <K>(E: Eq<K>) => {
   const _lookupWithKeyE = _lookupWithKey(E);
   return <A>(m: ReadonlyMap<K, A>, k: K) => {
      const found = _lookupWithKeyE(m, k);
      if (Mb.isJust(found)) {
         const r = new Map(m);
         r.delete(found.value[0]);
         return r;
      }
      return m;
   };
};

export const deleteAt = <K>(E: Eq<K>) => {
   const _deleteAtE = _deleteAt(E);
   return (k: K) => <A>(m: ReadonlyMap<K, A>) => _deleteAtE(m, k);
};

export const _updateAt = <K>(E: Eq<K>) => {
   const _lookupWithKeyE = _lookupWithKey(E);
   return <A>(m: ReadonlyMap<K, A>, k: K, a: A): Maybe<ReadonlyMap<K, A>> => {
      const found = _lookupWithKeyE(m, k);
      if (Mb.isNothing(found)) {
         return Mb.nothing();
      }
      const r = new Map(m);
      r.set(found.value[0], a);
      return Mb.just(r);
   };
};

export const updateAt = <K>(E: Eq<K>) => {
   const _updateAtE = _updateAt(E);
   return <A>(k: K, a: A) => (m: ReadonlyMap<K, A>) => _updateAtE(m, k, a);
};

export const _modifyAt = <K>(E: Eq<K>) => {
   const _lookupWithKeyE = _lookupWithKey(E);
   return <A>(m: ReadonlyMap<K, A>, k: K, f: (a: A) => A): Maybe<ReadonlyMap<K, A>> => {
      const found = _lookupWithKeyE(m, k);
      if (Mb.isNothing(found)) {
         return Mb.nothing();
      }
      const r = new Map(m);
      r.set(found.value[0], f(found.value[1]));
      return Mb.just(r);
   };
};

export const modifyAt = <K>(E: Eq<K>) => {
   const _modifyAtE = _modifyAt(E);
   return <A>(k: K, f: (a: A) => A) => (m: ReadonlyMap<K, A>) => _modifyAtE(m, k, f);
};

export const _pop = <K>(E: Eq<K>) => {
   const _lookupE = _lookup(E);
   const _deleteAtE = _deleteAt(E);
   return <A>(m: ReadonlyMap<K, A>, k: K): Maybe<readonly [A, ReadonlyMap<K, A>]> =>
      pipe(
         _lookupE(m, k),
         Mb.map((a) => [a, _deleteAtE(m, k)])
      );
};

export const pop = <K>(E: Eq<K>) => {
   const _popE = _pop(E);
   return (k: K) => <A>(m: ReadonlyMap<K, A>) => _popE(m, k);
};
