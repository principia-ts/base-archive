import { identity } from "@principia/core/Function";

import { _intersect, memoize } from "../utils";
import type { Encoder, OutputOf, TypeOf } from "./model";

export const nullable = <O, A>(or: Encoder<O, A>): Encoder<null | O, null | A> => ({
   encode: (a) => (a === null ? null : or.encode(a))
});

export const type = <P extends Record<string, Encoder<any, any>>>(
   properties: P
): Encoder<{ [K in keyof P]: OutputOf<P[K]> }, { [K in keyof P]: TypeOf<P[K]> }> => ({
   encode: (a) => {
      const o: Record<keyof P, any> = {} as any;
      for (const k in properties) {
         o[k] = properties[k].encode(a[k]);
      }
      return o;
   }
});

export const partial = <P extends Record<string, Encoder<any, any>>>(
   properties: P
): Encoder<Partial<{ [K in keyof P]: OutputOf<P[K]> }>, Partial<{ [K in keyof P]: TypeOf<P[K]> }>> => ({
   encode: (a) => {
      const o: Record<keyof P, any> = {} as any;
      for (const k in properties) {
         const v = a[k];
         // don't add missing properties
         if (k in a) {
            // don't strip undefined properties
            o[k] = v === undefined ? undefined : properties[k].encode(v);
         }
      }
      return o;
   }
});

export const record = <O, A>(codomain: Encoder<O, A>): Encoder<Record<string, O>, Record<string, A>> => ({
   encode: (r) => {
      const o: Record<string, O> = {};
      for (const k in r) {
         o[k] = codomain.encode(r[k]);
      }
      return o;
   }
});

export const array = <O, A>(item: Encoder<O, A>): Encoder<Array<O>, Array<A>> => ({
   encode: (as) => as.map(item.encode)
});

export const tuple = <C extends ReadonlyArray<Encoder<any, any>>>(
   ...components: C
): Encoder<{ [K in keyof C]: OutputOf<C[K]> }, { [K in keyof C]: TypeOf<C[K]> }> => ({
   encode: (as) => components.map((c, i) => c.encode(as[i])) as any
});

export const intersect = <P, B>(right: Encoder<P, B>) => <O, A>(left: Encoder<O, A>): Encoder<O & P, A & B> => ({
   encode: (ab) => _intersect(left.encode(ab), right.encode(ab))
});

export const sum_ = <T extends string, MS extends Record<string, Encoder<any, any>>>(
   tag: T,
   members: MS
): Encoder<OutputOf<MS[keyof MS]>, TypeOf<MS[keyof MS]>> => ({
   encode: (a) => members[a[tag]].encode(a)
});

export const sum = <T extends string>(tag: T) => <MS extends Record<string, Encoder<any, any>>>(
   members: MS
): Encoder<OutputOf<MS[keyof MS]>, TypeOf<MS[keyof MS]>> => ({
   encode: (a) => members[a[tag]].encode(a)
});

export const lazy = <O, A>(f: () => Encoder<O, A>): Encoder<O, A> => {
   const get = memoize<void, Encoder<O, A>>(f);
   return {
      encode: (a) => get().encode(a)
   };
};

export const contramap_ = <E, A, B>(fa: Encoder<E, A>, f: (b: B) => A): Encoder<E, B> => ({
   encode: (b) => fa.encode(f(b))
});

export const contramap: <A, B>(f: (b: B) => A) => <E>(fa: Encoder<E, A>) => Encoder<E, B> = (f) => (fa) =>
   contramap_(fa, f);

export const compose_ = <E, A, B>(ab: Encoder<A, B>, ea: Encoder<E, A>): Encoder<E, B> => contramap_(ea, ab.encode);

export const compose: <E, A>(ea: Encoder<E, A>) => <B>(ab: Encoder<A, B>) => Encoder<E, B> = (ea) => (ab) =>
   compose_(ab, ea);

export const id = <A>(): Encoder<A, A> => ({
   encode: identity
});
