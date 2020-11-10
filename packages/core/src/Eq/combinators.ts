import * as E from "@principia/prelude/Eq";

import * as A from "../Array";
import type { ReadonlyRecord } from "../Record";
import * as R from "../Record";
import { memoize } from "../Utils";
import type { Eq } from "./model";

/*
 * -------------------------------------------
 * Eq Combinators
 * -------------------------------------------
 */

export * from "@principia/prelude/Eq/combinators";

export const nullable = <A>(or: Eq<A>): Eq<null | A> =>
   E.fromEquals((x, y) => (x === null || y === null ? x === y : or.equals_(x, y)));

export const type: <A>(eqs: { [K in keyof A]: Eq<A[K]> }) => Eq<{ [K in keyof A]: A[K] }> = E.getStructEq;

export const partial = <A>(properties: { [K in keyof A]: Eq<A[K]> }): Eq<Partial<{ [K in keyof A]: A[K] }>> =>
   E.fromEquals((x, y) => {
      for (const k in properties) {
         const xk = x[k];
         const yk = y[k];
         if (!(xk === undefined || yk === undefined ? xk === yk : properties[k].equals_(xk!, yk!))) {
            return false;
         }
      }
      return true;
   });

export const record: <A>(codomain: Eq<A>) => Eq<ReadonlyRecord<string, A>> = R.getEq;

export const array: <A>(item: Eq<A>) => Eq<ReadonlyArray<A>> = A.getEq;

export const tuple: <A extends ReadonlyArray<unknown>>(
   ...components: { [K in keyof A]: Eq<A[K]> }
) => Eq<A> = E.getTupleEq as any;

export const intersect_ = <A, B>(left: Eq<A>, right: Eq<B>): Eq<A & B> =>
   E.fromEquals((x, y) => left.equals_(x, y) && right.equals_(x, y));

export const intersect = <B>(right: Eq<B>) => <A>(left: Eq<A>): Eq<A & B> => intersect_(left, right);

export const sum_ = <T extends string, A>(
   tag: T,
   members: { [K in keyof A]: Eq<A[K] & Record<T, K>> }
): Eq<A[keyof A]> =>
   E.fromEquals((x: ReadonlyRecord<string, any>, y: ReadonlyRecord<string, any>) => {
      const vx = x[tag];
      const vy = y[tag];
      if (vx !== vy) {
         return false;
      }
      return members[vx].equals(x, y);
   });

export const sum = <T extends string>(tag: T) => <A>(
   members: { [K in keyof A]: Eq<A[K] & Record<T, K>> }
): Eq<A[keyof A]> => sum_(tag, members);

export const lazy = <A>(f: () => Eq<A>): Eq<A> => {
   const get = memoize<void, Eq<A>>(f);
   return E.fromEquals((x, y) => get().equals_(x, y));
};
