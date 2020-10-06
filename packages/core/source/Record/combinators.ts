import * as Mb from "../Maybe";
import { Maybe } from "../Maybe";
import { ReadonlyRecord } from "./Record";

const _hasOwnProperty = Object.prototype.hasOwnProperty;

export const size = (r: ReadonlyRecord<string, unknown>): number => Object.keys(r).length;

export const keys = <N extends string>(r: ReadonlyRecord<N, unknown>): ReadonlyArray<N> => Object.keys(r) as any;

export const _collect = <N extends string, A, B>(r: ReadonlyRecord<N, A>, f: (k: N, a: A) => B) => {
   const out: Array<B> = [];
   const ks = keys(r);
   for (let i = 0; i < ks.length; i++) {
      const key = ks[i];
      out.push(f(key, r[key]));
   }
   return out;
};

export const collect = <N extends string, A, B>(f: (k: N, a: A) => B) => (r: ReadonlyRecord<N, A>) => _collect(r, f);

export const _insertAt = <N extends string, K extends string, A>(
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
   _insertAt(r, k, a);

export const _deleteAt = <N extends string, A, K extends N>(
   r: ReadonlyRecord<N, A>,
   k: K
): ReadonlyRecord<Exclude<N, K>, A> => {
   if (!_hasOwnProperty.call(r, k)) {
      return r;
   }
   const out: Record<N, A> = Object.assign({}, r);
   delete out[k as any];
   return out as any;
};

export const deleteAt = <N extends string, K extends N>(k: K) => <A>(r: ReadonlyRecord<N, A>) => _deleteAt(r, k);

export const _updateAt = <N extends string, A>(r: ReadonlyRecord<N, A>, k: N, a: A) => {
   if (!_hasOwnProperty.call(r, k)) {
      return Mb.nothing();
   }
   if (r[k] === a) {
      return Mb.just(r);
   }
   const out: Record<N, A> = Object.assign({}, r);
   out[k] = a;
   return Mb.just(out);
};

export const updateAt = <N extends string, A>(k: N, a: A) => (r: ReadonlyRecord<N, A>) => _updateAt(r, k, a);

export const _modifyAt = <N extends string, A>(r: ReadonlyRecord<N, A>, k: N, f: (a: A) => A) => {
   if (!_hasOwnProperty.call(r, k)) {
      return Mb.nothing();
   }
   const out: Record<N, A> = Object.assign({}, r);
   out[k] = f(r[k]);
   return Mb.just(out);
};

export const modifyAt = <N extends string, A>(k: N, f: (a: A) => A) => (r: ReadonlyRecord<N, A>) => _modifyAt(r, k, f);

export const _lookup = <N extends string, A>(r: ReadonlyRecord<N, A>, k: N): Maybe<A> =>
   _hasOwnProperty.call(r, k) ? Mb.just(r[k]) : Mb.nothing();

export const lookup = <N extends string>(k: N) => <A>(r: ReadonlyRecord<N, A>) => _lookup(r, k);

export const _pop = <N extends string, K extends N, A>(
   r: ReadonlyRecord<N, A>,
   k: K
): Maybe<readonly [A, ReadonlyRecord<Exclude<N, K>, A>]> => {
   const deleteAtk = deleteAt(k);
   const oa = lookup(k)(r);
   return Mb.isNothing(oa) ? Mb.nothing() : Mb.just([oa.value, deleteAtk(r)]);
};

export const pop = <N extends string, K extends N>(k: K) => <A>(r: ReadonlyRecord<N, A>) => _pop(r, k);
