import type { Eq } from "@principia/prelude/Eq";
import type { Ord } from "@principia/prelude/Ord";
import { toNumber } from "@principia/prelude/Ordering";

import { pipe } from "../Function";
import type { Option } from "../Option";
import * as O from "../Option";

interface Next<A> {
  readonly done?: boolean;
  readonly value: A;
}

/**
 * Get a sorted array of the keys contained in a map
 *
 * @since 2.5.0
 */
export function keys<K>(O: Ord<K>): <A>(m: ReadonlyMap<K, A>) => ReadonlyArray<K> {
  return (m) => Array.from(m.keys()).sort((a, b) => toNumber(O.compare_(a, b)));
}

export function lookupWithKey_<K>(E: Eq<K>) {
  return <A>(m: ReadonlyMap<K, A>, k: K): Option<readonly [K, A]> => {
    const entries = m.entries();
    let e: Next<readonly [K, A]>;
    while (!(e = entries.next()).done) {
      const [ka, a] = e.value;
      if (E.equals_(ka, k)) {
        return O.some([ka, a]);
      }
    }
    return O.none();
  };
}

export function lookupWithKey<K>(
  E: Eq<K>
): (k: K) => <A>(m: ReadonlyMap<K, A>) => Option<readonly [K, A]> {
  const lookupWithKeyE_ = lookupWithKey_(E);
  return (k) => (m) => lookupWithKeyE_(m, k);
}

/**
 * Calculate the number of key/value pairs in a map
 */
export function size<K, A>(d: Map<K, A>): number {
  return d.size;
}

export function lookup_<K>(E: Eq<K>): <A>(m: ReadonlyMap<K, A>, k: K) => Option<A> {
  const lookupWithKeyE_ = lookupWithKey_(E);
  return (m, k) =>
    pipe(
      lookupWithKeyE_(m, k),
      O.map(([_, a]) => a)
    );
}

export function lookup<K>(E: Eq<K>): (k: K) => <A>(m: ReadonlyMap<K, A>) => Option<A> {
  const lookupE_ = lookup_(E);
  return (k) => (m) => lookupE_(m, k);
}

export function unsafeInsertAt_<K, A>(m: ReadonlyMap<K, A>, k: K, a: A): ReadonlyMap<K, A> {
  const r = new Map(m);
  r.set(k, a);
  return r;
}

export function unsafeInsertAt<K, A>(k: K, a: A): (m: ReadonlyMap<K, A>) => ReadonlyMap<K, A> {
  return (m) => unsafeInsertAt_(m, k, a);
}

export function insertAt_<K>(E: Eq<K>): <A>(m: ReadonlyMap<K, A>, k: K, a: A) => ReadonlyMap<K, A> {
  const lookupWithKeyE_ = lookupWithKey_(E);
  return (m, k, a) => {
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
}

export function insertAt<K>(
  E: Eq<K>
): <A>(k: K, a: A) => (m: ReadonlyMap<K, A>) => ReadonlyMap<K, A> {
  const insertAtE_ = insertAt_(E);
  return (k, a) => (m) => insertAtE_(m, k, a);
}

export function copy<K, A>(me: ReadonlyMap<K, A>): Map<K, A> {
  const m = new Map<K, A>();

  me.forEach((v, k) => {
    m.set(k, v);
  });

  return m;
}

export function insert_<K, A>(me: ReadonlyMap<K, A>, k: K, a: A): ReadonlyMap<K, A> {
  const m = copy<K, A>(me);

  m.set(k, a);

  return m;
}

export function insert<K, A>(k: K, a: A): (me: ReadonlyMap<K, A>) => ReadonlyMap<K, A> {
  return (me) => insert_(me, k, a);
}

export function remove_<K, A>(m: ReadonlyMap<K, A>, k: K): ReadonlyMap<K, A> {
  const r = new Map(m);
  r.delete(k);
  return m;
}

export function remove<K>(k: K): <A>(m: ReadonlyMap<K, A>) => ReadonlyMap<K, A> {
  return (m) => remove_(m, k);
}

export function deleteAt_<K>(E: Eq<K>): <A>(m: ReadonlyMap<K, A>, k: K) => ReadonlyMap<K, A> {
  const lookupWithKeyE_ = lookupWithKey_(E);
  return (m, k) => {
    const found = lookupWithKeyE_(m, k);
    if (O.isSome(found)) {
      const r = new Map(m);
      r.delete(found.value[0]);
      return r;
    }
    return m;
  };
}

export function deleteAt<K>(E: Eq<K>): (k: K) => <A>(m: ReadonlyMap<K, A>) => ReadonlyMap<K, A> {
  const deleteAtE_ = deleteAt_(E);
  return (k) => (m) => deleteAtE_(m, k);
}

export function removeMany_<K, A>(m: ReadonlyMap<K, A>, ks: Iterable<K>): ReadonlyMap<K, A> {
  const r = new Map(m);
  for (const k of ks) {
    r.delete(k);
  }
  return r;
}

export function removeMany<K>(ks: Iterable<K>): <A>(m: ReadonlyMap<K, A>) => ReadonlyMap<K, A> {
  return (m) => removeMany_(m, ks);
}

export function updateAt_<K>(
  E: Eq<K>
): <A>(m: ReadonlyMap<K, A>, k: K, a: A) => Option<ReadonlyMap<K, A>> {
  const lookupWithKeyE_ = lookupWithKey_(E);
  return (m, k, a) => {
    const found = lookupWithKeyE_(m, k);
    if (O.isNone(found)) {
      return O.none();
    }
    const r = new Map(m);
    r.set(found.value[0], a);
    return O.some(r);
  };
}

export function updateAt<K>(
  E: Eq<K>
): <A>(k: K, a: A) => (m: ReadonlyMap<K, A>) => Option<ReadonlyMap<K, A>> {
  const updateAtE_ = updateAt_(E);
  return (k, a) => (m) => updateAtE_(m, k, a);
}

export function modifyAt_<K>(
  E: Eq<K>
): <A>(m: ReadonlyMap<K, A>, k: K, f: (a: A) => A) => Option<ReadonlyMap<K, A>> {
  const lookupWithKeyE_ = lookupWithKey_(E);
  return (m, k, f) => {
    const found = lookupWithKeyE_(m, k);
    if (O.isNone(found)) {
      return O.none();
    }
    const r = new Map(m);
    r.set(found.value[0], f(found.value[1]));
    return O.some(r);
  };
}

export function modifyAt<K>(
  E: Eq<K>
): <A>(k: K, f: (a: A) => A) => (m: ReadonlyMap<K, A>) => Option<ReadonlyMap<K, A>> {
  const modifyAtE_ = modifyAt_(E);
  return (k, f) => (m) => modifyAtE_(m, k, f);
}

export function pop_<K>(
  E: Eq<K>
): <A>(m: ReadonlyMap<K, A>, k: K) => Option<readonly [A, ReadonlyMap<K, A>]> {
  const lookupE_ = lookup_(E);
  const deleteAtE_ = deleteAt_(E);
  return (m, k) =>
    pipe(
      lookupE_(m, k),
      O.map((a) => [a, deleteAtE_(m, k)])
    );
}

export function pop<K>(
  E: Eq<K>
): (k: K) => <A>(m: ReadonlyMap<K, A>) => Option<readonly [A, ReadonlyMap<K, A>]> {
  const popE_ = pop_(E);
  return (k) => (m) => popE_(m, k);
}
