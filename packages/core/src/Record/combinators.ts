import type { Option } from "../Option";
import * as O from "../Option";
import type { ReadonlyRecord } from "./model";
import { keys } from "./utils";

const hasOwnProperty_ = Object.prototype.hasOwnProperty;

export function collect_<N extends string, A, B>(r: ReadonlyRecord<N, A>, f: (k: N, a: A) => B): ReadonlyArray<B> {
   const out: Array<B> = [];
   const ks = keys(r);
   for (let i = 0; i < ks.length; i++) {
      const key = ks[i];
      out.push(f(key, r[key]));
   }
   return out;
}

export function collect<N extends string, A, B>(f: (k: N, a: A) => B): (r: ReadonlyRecord<N, A>) => ReadonlyArray<B> {
   return (r) => collect_(r, f);
}

export function insertAt_<N extends string, K extends string, A>(
   r: ReadonlyRecord<N, A>,
   k: K,
   a: A
): ReadonlyRecord<N | K, A> {
   if (r[k as any] === a) {
      return r as any;
   }
   const out: Record<N | K, A> = Object.assign({}, r) as any;
   out[k] = a;
   return out;
}

export function insertAt<K extends string, A>(
   k: K,
   a: A
): <N extends string>(r: ReadonlyRecord<N, A>) => ReadonlyRecord<K | N, A> {
   return (r) => insertAt_(r, k, a);
}

export function deleteAt_<N extends string, A, K extends N>(
   r: ReadonlyRecord<N, A>,
   k: K
): ReadonlyRecord<Exclude<N, K>, A> {
   if (!hasOwnProperty_.call(r, k)) {
      return r;
   }
   const out: Record<N, A> = Object.assign({}, r);
   delete out[k as any];
   return out as any;
}

export function deleteAt<N extends string, K extends N>(
   k: K
): <A>(r: Readonly<Record<N, A>>) => Readonly<Record<Exclude<N, K>, A>> {
   return (r) => deleteAt_(r, k);
}

export function updateAt_<N extends string, A>(r: ReadonlyRecord<N, A>, k: N, a: A): Option<ReadonlyRecord<N, A>> {
   if (!hasOwnProperty_.call(r, k)) {
      return O.none();
   }
   if (r[k] === a) {
      return O.some(r);
   }
   const out: Record<N, A> = Object.assign({}, r);
   out[k] = a;
   return O.some(out);
}

export function updateAt<N extends string, A>(k: N, a: A): (r: ReadonlyRecord<N, A>) => Option<ReadonlyRecord<N, A>> {
   return (r) => updateAt_(r, k, a);
}

export function modifyAt_<N extends string, A>(
   r: ReadonlyRecord<N, A>,
   k: N,
   f: (a: A) => A
): Option<ReadonlyRecord<N, A>> {
   if (!hasOwnProperty_.call(r, k)) {
      return O.none();
   }
   const out: Record<N, A> = Object.assign({}, r);
   out[k] = f(r[k]);
   return O.some(out);
}

export function modifyAt<N extends string, A>(
   k: N,
   f: (a: A) => A
): (r: ReadonlyRecord<N, A>) => Option<ReadonlyRecord<N, A>> {
   return (r) => modifyAt_(r, k, f);
}

export function lookup_<N extends string, A>(r: ReadonlyRecord<N, A>, k: N): Option<A> {
   return hasOwnProperty_.call(r, k) ? O.some(r[k]) : O.none();
}

export function lookup<N extends string>(k: N): <A>(r: ReadonlyRecord<N, A>) => Option<A> {
   return (r) => lookup_(r, k);
}

export function pop_<N extends string, K extends N, A>(
   r: ReadonlyRecord<N, A>,
   k: K
): Option<readonly [A, ReadonlyRecord<Exclude<N, K>, A>]> {
   const deleteAtk = deleteAt(k);
   const oa = lookup(k)(r);
   return O.isNone(oa) ? O.none() : O.some([oa.value, deleteAtk(r)]);
}

export function pop<N extends string, K extends N>(
   k: K
): <A>(r: ReadonlyRecord<N, A>) => Option<readonly [A, ReadonlyRecord<Exclude<N, K>, A>]> {
   return (r) => pop_(r, k);
}
