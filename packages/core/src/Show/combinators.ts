import * as S from "@principia/prelude/Show";

import { memoize } from "../_utils";
import * as A from "../Array";
import { pipe } from "../Function";
import type { ReadonlyRecord } from "../Record";
import * as R from "../Record";
import type { Show } from "./model";

/*
 * -------------------------------------------
 * Show Combinators
 * -------------------------------------------
 */

export * from "@principia/prelude/Show/combinators";

export const named_ = <A>(show: Show<A>, name: string | undefined): Show<A> =>
   S.fromShow((a) => (typeof name !== "undefined" ? `<${name}>(${show.show(a)})` : show.show(a)));

export const named = (name: string | undefined) => <A>(show: Show<A>): Show<A> => named_(show, name);

export const nullable = <A>(or: Show<A>): Show<A | null> => S.fromShow((a) => (a === null ? "null" : or.show(a)));

export const undefinable = <A>(or: Show<A>): Show<A | undefined> =>
   S.fromShow((a) => (typeof a === "undefined" ? "undefined" : or.show(a)));

export const type: <A extends Readonly<Record<string, any>>>(
   shows: { [K in keyof A]: Show<A[K]> }
) => Show<{ [K in keyof A]: A[K] }> = S.getStructShow;

export const partial = <A extends Readonly<Record<string, any>>>(
   properties: { [K in keyof A]: Show<A[K]> }
): Show<Partial<{ [K in keyof A]: A[K] }>> =>
   pipe(
      properties,
      R.map((s: Show<any>) => undefinable(s)),
      type
   );

export const record: <A>(codomain: Show<A>) => Show<ReadonlyRecord<string, A>> = R.getShow;

export const array: <A>(item: Show<A>) => Show<ReadonlyArray<A>> = A.getShow;

export const tuple: <A extends ReadonlyArray<unknown>>(
   ...components: { [K in keyof A]: Show<A[K]> }
) => Show<A> = S.getTupleShow as any;

export const intersect_ = <A, B>(left: Show<A>, right: Show<B>): Show<A & B> =>
   S.fromShow((a) => `${left.show(a)} & ${right.show(a)}`);

export const intersect = <B>(right: Show<B>) => <A>(left: Show<A>): Show<A & B> => intersect_(left, right);

export const sum_ = <T extends string, A>(
   tag: T,
   members: { [K in keyof A]: Show<A[K] & Record<T, K>> }
): Show<A[keyof A]> => S.fromShow((a: ReadonlyRecord<string, any>) => members[a[tag]].show(a));

export const sum = <T extends string>(tag: T) => <A>(
   members: { [K in keyof A]: Show<A[K] & Record<T, K>> }
): Show<A[keyof A]> => sum_(tag, members);

export const lazy = <A>(f: () => Show<A>): Show<A> => {
   const get = memoize<void, Show<A>>(f);
   return S.fromShow((a) => get().show(a));
};
