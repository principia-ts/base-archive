import type { ReadonlyRecord } from "../Record";
import type { Eq } from "./core";

import * as A from "../Array";
import { memoize } from "../Function";
import * as R from "../Record";
import { makeEq } from "./core";

/*
 * -------------------------------------------
 * Combinators
 * -------------------------------------------
 */

export function struct<O extends Readonly<Record<string, any>>>(
  eqs: { [K in keyof O]: Eq<O[K]> }
): Eq<O> {
  return makeEq((x, y) => {
    for (const k in eqs) {
      if (!eqs[k].equals_(x[k], y[k])) {
        return false;
      }
    }
    return true;
  });
}

export function tuple<T extends ReadonlyArray<Eq<any>>>(
  ...eqs: T
): Eq<{ [K in keyof T]: T[K] extends Eq<infer A> ? A : never }> {
  return makeEq((x, y) => eqs.every((E, i) => E.equals_(x[i], y[i])));
}

export function nullable<A>(or: Eq<A>): Eq<null | A> {
  return makeEq((x, y) => (x === null || y === null ? x === y : or.equals_(x, y)));
}

export const type: <A>(eqs: { [K in keyof A]: Eq<A[K]> }) => Eq<{ [K in keyof A]: A[K] }> = struct;

export function partial<A>(
  properties: {
    [K in keyof A]: Eq<A[K]>;
  }
): Eq<
  Partial<
    {
      [K in keyof A]: A[K];
    }
  >
> {
  return makeEq((x, y) => {
    for (const k in properties) {
      const xk = x[k];
      const yk = y[k];
      if (!(xk === undefined || yk === undefined ? xk === yk : properties[k].equals_(xk!, yk!))) {
        return false;
      }
    }
    return true;
  });
}

export const record: <A>(codomain: Eq<A>) => Eq<ReadonlyRecord<string, A>> = R.getEq;

export const array: <A>(item: Eq<A>) => Eq<ReadonlyArray<A>> = A.getEq;

export function intersect_<A, B>(left: Eq<A>, right: Eq<B>): Eq<A & B> {
  return makeEq((x, y) => left.equals_(x, y) && right.equals_(x, y));
}

export function intersect<B>(right: Eq<B>): <A>(left: Eq<A>) => Eq<A & B> {
  return (left) => intersect_(left, right);
}

export function sum_<T extends string, A>(
  tag: T,
  members: {
    [K in keyof A]: Eq<A[K] & Record<T, K>>;
  }
): Eq<A[keyof A]> {
  return makeEq((x: ReadonlyRecord<string, any>, y: ReadonlyRecord<string, any>) => {
    const vx = x[tag];
    const vy = y[tag];
    if (vx !== vy) {
      return false;
    }
    return members[vx].equals(x, y);
  });
}

export function sum<T extends string>(
  tag: T
): <A>(members: { [K in keyof A]: Eq<A[K] & Record<T, K>> }) => Eq<A[keyof A]> {
  return (members) => sum_(tag, members);
}

export function lazy<A>(f: () => Eq<A>): Eq<A> {
  const get = memoize<void, Eq<A>>(f);
  return makeEq((x, y) => get().equals_(x, y));
}
