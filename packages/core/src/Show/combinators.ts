import * as S from "@principia/prelude/Show";

import * as A from "../Array/_core";
import { pipe } from "../Function";
import type { ReadonlyRecord } from "../Record";
import * as R from "../Record";
import { memoize } from "../Utils";
import type { Show } from "./model";

/*
 * -------------------------------------------
 * Show Combinators
 * -------------------------------------------
 */

export * from "@principia/prelude/Show/combinators";

export function named_<A>(show: Show<A>, name: string | undefined): Show<A> {
  return S.fromShow((a) =>
    typeof name !== "undefined" ? `<${name}>(${show.show(a)})` : show.show(a)
  );
}

export function named(name: string | undefined): <A>(show: S.Show<A>) => S.Show<A> {
  return (show) => named_(show, name);
}

export function nullable<A>(or: Show<A>): Show<A | null> {
  return S.fromShow((a) => (a === null ? "null" : or.show(a)));
}

export function undefinable<A>(or: Show<A>): Show<A | undefined> {
  return S.fromShow((a) => (typeof a === "undefined" ? "undefined" : or.show(a)));
}

export const type: <A extends Readonly<Record<string, any>>>(
  shows: { [K in keyof A]: Show<A[K]> }
) => Show<{ [K in keyof A]: A[K] }> = S.getStructShow;

export function partial<A extends Readonly<Record<string, any>>>(
  properties: {
    [K in keyof A]: Show<A[K]>;
  }
): Show<
  Partial<
    {
      [K in keyof A]: A[K];
    }
  >
> {
  return pipe(
    properties,
    R.map((s: Show<any>) => undefinable(s)),
    type
  );
}

export const record: <A>(codomain: Show<A>) => Show<ReadonlyRecord<string, A>> = R.getShow;

export const array: <A>(item: Show<A>) => Show<ReadonlyArray<A>> = A.getShow;

export const tuple: <A extends ReadonlyArray<unknown>>(
  ...components: { [K in keyof A]: Show<A[K]> }
) => Show<A> = S.getTupleShow as any;

export function intersect_<A, B>(left: Show<A>, right: Show<B>): Show<A & B> {
  return S.fromShow((a) => `${left.show(a)} & ${right.show(a)}`);
}

export function intersect<B>(right: Show<B>): <A>(left: S.Show<A>) => S.Show<A & B> {
  return (left) => intersect_(left, right);
}

export function sum_<T extends string, A>(
  tag: T,
  members: {
    [K in keyof A]: Show<A[K] & Record<T, K>>;
  }
): Show<A[keyof A]> {
  return S.fromShow((a: ReadonlyRecord<string, any>) => members[a[tag]].show(a));
}

export function sum<T extends string>(
  tag: T
): <A>(members: { [K in keyof A]: S.Show<A[K] & Record<T, K>> }) => S.Show<A[keyof A]> {
  return (members) => sum_(tag, members);
}

export function lazy<A>(f: () => Show<A>): Show<A> {
  const get = memoize<void, Show<A>>(f);
  return S.fromShow((a) => get().show(a));
}
