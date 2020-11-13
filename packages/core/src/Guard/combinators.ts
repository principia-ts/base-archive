/*
 * -------------------------------------------
 * Guard Combinators
 * -------------------------------------------
 */

import { pipe } from "../Function";
import type { ReadonlyRecord } from "../Record";
import { memoize } from "../Utils";
import type { Guard } from "./Guard";
import { UnknownArray, UnknownRecord } from "./primitives";

export function refine<I, A extends I, B extends A>(refinement: (a: A) => a is B): (from: Guard<I, A>) => Guard<I, B> {
   return (from) => ({
      is: (u): u is B => from.is(u) && refinement(u)
   });
}

export function nullable<I, A extends I>(or: Guard<I, A>): Guard<null | I, null | A> {
   return {
      is: (u): u is null | A => u === null || or.is(u)
   };
}

export function type<A>(
   properties: {
      [K in keyof A]: Guard<unknown, A[K]>;
   }
): Guard<
   unknown,
   {
      [K in keyof A]: A[K];
   }
> {
   return pipe(
      UnknownRecord,
      refine((r): r is {
         [K in keyof A]: A[K];
      } => {
         for (const k in properties) {
            if (!(k in r) || !properties[k].is(r[k])) {
               return false;
            }
         }
         return true;
      })
   );
}

export function partial<A>(
   properties: {
      [K in keyof A]: Guard<unknown, A[K]>;
   }
): Guard<
   unknown,
   Partial<
      {
         [K in keyof A]: A[K];
      }
   >
> {
   return pipe(
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
}

export function array<A>(item: Guard<unknown, A>): Guard<unknown, ReadonlyArray<A>> {
   return pipe(
      UnknownArray,
      refine((u): u is ReadonlyArray<A> => u.every(item.is))
   );
}

export function record<A>(codomain: Guard<unknown, A>): Guard<unknown, ReadonlyRecord<string, A>> {
   return pipe(
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
}

export function tuple<A extends ReadonlyArray<unknown>>(
   ...components: {
      [K in keyof A]: Guard<unknown, A[K]>;
   }
): Guard<unknown, A> {
   return {
      is: (u): u is A =>
         Array.isArray(u) && u.length === components.length && components.every((g, index) => g.is(u[index]))
   };
}

export function intersect<B>(right: Guard<unknown, B>) {
   return <A>(left: Guard<unknown, A>): Guard<unknown, A & B> => ({
      is: (u): u is A & B => left.is(u) && right.is(u)
   });
}

export function union<A extends readonly [unknown, ...Array<unknown>]>(
   ...members: {
      [K in keyof A]: Guard<unknown, A[K]>;
   }
): Guard<unknown, A[number]> {
   return {
      is: (u): u is A | A[number] => members.some((m) => m.is(u))
   };
}

export function sum<T extends string>(tag: T) {
   return <A>(
      members: {
         [K in keyof A]: Guard<unknown, A[K]>;
      }
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
}

export function lazy<A>(f: () => Guard<unknown, A>): Guard<unknown, A> {
   const get = memoize<void, Guard<unknown, A>>(f);
   return {
      is: (u): u is A => get().is(u)
   };
}
