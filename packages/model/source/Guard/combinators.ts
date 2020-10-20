/*
 * -------------------------------------------
 * Guard Combinators
 * -------------------------------------------
 */

import { pipe } from "@principia/core/Function";
import type { ReadonlyRecord } from "@principia/core/Record";

import { memoize } from "../utils";
import type { Guard } from "./Guard";
import { string, UnknownArray, UnknownRecord } from "./primitives";

export const refine = <I, A extends I, B extends A>(refinement: (a: A) => a is B) => (
   from: Guard<I, A>
): Guard<I, B> => ({
   is: (u): u is B => from.is(u) && refinement(u)
});

export const nullable = <I, A extends I>(or: Guard<I, A>): Guard<null | I, null | A> => ({
   is: (u): u is null | A => u === null || or.is(u)
});

export const type = <A>(
   properties: { [K in keyof A]: Guard<unknown, A[K]> }
): Guard<unknown, { [K in keyof A]: A[K] }> =>
   pipe(
      UnknownRecord,
      refine((r): r is { [K in keyof A]: A[K] } => {
         for (const k in properties) {
            if (!(k in r) || !properties[k].is(r[k])) {
               return false;
            }
         }
         return true;
      })
   );

export const partial = <A>(
   properties: { [K in keyof A]: Guard<unknown, A[K]> }
): Guard<unknown, Partial<{ [K in keyof A]: A[K] }>> =>
   pipe(
      UnknownRecord,
      refine((r): r is Partial<A> => {
         for (const k in properties) {
            const v = r[k];
            if (v !== undefined && !properties[k].is(r[k])) {
               return false;
            }
         }
         return true;
      })
   );

export const array = <A>(item: Guard<unknown, A>): Guard<unknown, ReadonlyArray<A>> =>
   pipe(
      UnknownArray,
      refine((u): u is ReadonlyArray<A> => u.every(item.is))
   );

export const record = <A>(codomain: Guard<unknown, A>): Guard<unknown, ReadonlyRecord<string, A>> =>
   pipe(
      UnknownRecord,
      refine((r): r is ReadonlyRecord<string, A> => {
         for (const k in r) {
            if (!codomain.is(r[k])) {
               return false;
            }
         }
         return true;
      })
   );

export const tuple = <A extends ReadonlyArray<unknown>>(
   ...components: { [K in keyof A]: Guard<unknown, A[K]> }
): Guard<unknown, A> => ({
   is: (u): u is A =>
      Array.isArray(u) && u.length === components.length && components.every((g, index) => g.is(u[index]))
});

export const intersect = <B>(right: Guard<unknown, B>) => <A>(left: Guard<unknown, A>): Guard<unknown, A & B> => ({
   is: (u): u is A & B => left.is(u) && right.is(u)
});

export const union = <A extends readonly [unknown, ...Array<unknown>]>(
   ...members: { [K in keyof A]: Guard<unknown, A[K]> }
): Guard<unknown, A[number]> => ({
   is: (u): u is A | A[number] => members.some((m) => m.is(u))
});

export const sum = <T extends string>(tag: T) => <A>(
   members: { [K in keyof A]: Guard<unknown, A[K]> }
): Guard<unknown, A[keyof A]> =>
   pipe(
      UnknownRecord,
      refine((r): r is any => {
         const v = r[tag] as keyof A;
         if (v in members) {
            return members[v].is(r);
         }
         return false;
      })
   );

export const lazy = <A>(f: () => Guard<unknown, A>): Guard<unknown, A> => {
   const get = memoize<void, Guard<unknown, A>>(f);
   return {
      is: (u): u is A => get().is(u)
   };
};
