import type { Option } from "../Option";
import * as O from "../Option";
import type { ReadonlyRecord } from "./model";
import { keys } from "./utils";

const hasOwnProperty_ = Object.prototype.hasOwnProperty;

export const collect_ = <N extends string, A, B>(r: ReadonlyRecord<N, A>, f: (k: N, a: A) => B) => {
   const out: Array<B> = [];
   const ks = keys(r);
   for (let i = 0; i < ks.length; i++) {
      const key = ks[i];
      out.push(f(key, r[key]));
   }
   return out;
};

export const collect = <N extends string, A, B>(f: (k: N, a: A) => B) => (r: ReadonlyRecord<N, A>) => collect_(r, f);

export const insertAt_ = <N extends string, K extends string, A>(
   r: ReadonlyRecord<N, A>,
   k: K,
   a: A
): ReadonlyRecord<N | K, A> => {
   if (r[k as any] === a) {
      return r as any;
   }
   const out: Record<N | K, A> = Object.assign({}, r) as any;
   out[k] = a;
   return out;
};

export const insertAt = <K extends string, A>(k: K, a: A) => <N extends string>(r: ReadonlyRecord<N, A>) =>
   insertAt_(r, k, a);

export const deleteAt_ = <N extends string, A, K extends N>(
   r: ReadonlyRecord<N, A>,
   k: K
): ReadonlyRecord<Exclude<N, K>, A> => {
   if (!hasOwnProperty_.call(r, k)) {
      return r;
   }
   const out: Record<N, A> = Object.assign({}, r);
   delete out[k as any];
   return out as any;
};

export const deleteAt = <N extends string, K extends N>(k: K) => <A>(r: ReadonlyRecord<N, A>) => deleteAt_(r, k);

export const updateAt_ = <N extends string, A>(r: ReadonlyRecord<N, A>, k: N, a: A) => {
   if (!hasOwnProperty_.call(r, k)) {
      return O.none();
   }
   if (r[k] === a) {
      return O.some(r);
   }
   const out: Record<N, A> = Object.assign({}, r);
   out[k] = a;
   return O.some(out);
};

export const updateAt = <N extends string, A>(k: N, a: A) => (r: ReadonlyRecord<N, A>) => updateAt_(r, k, a);

export const modifyAt_ = <N extends string, A>(r: ReadonlyRecord<N, A>, k: N, f: (a: A) => A) => {
   if (!hasOwnProperty_.call(r, k)) {
      return O.none();
   }
   const out: Record<N, A> = Object.assign({}, r);
   out[k] = f(r[k]);
   return O.some(out);
};

export const modifyAt = <N extends string, A>(k: N, f: (a: A) => A) => (r: ReadonlyRecord<N, A>) => modifyAt_(r, k, f);

export const lookup_ = <N extends string, A>(r: ReadonlyRecord<N, A>, k: N): Option<A> =>
   hasOwnProperty_.call(r, k) ? O.some(r[k]) : O.none();

export const lookup = <N extends string>(k: N) => <A>(r: ReadonlyRecord<N, A>) => lookup_(r, k);

export const pop_ = <N extends string, K extends N, A>(
   r: ReadonlyRecord<N, A>,
   k: K
): Option<readonly [A, ReadonlyRecord<Exclude<N, K>, A>]> => {
   const deleteAtk = deleteAt(k);
   const oa = lookup(k)(r);
   return O.isNone(oa) ? O.none() : O.some([oa.value, deleteAtk(r)]);
};

export const pop = <N extends string, K extends N>(k: K) => <A>(r: ReadonlyRecord<N, A>) => pop_(r, k);
