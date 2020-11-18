import type { Eq } from "@principia/prelude/Eq";
import * as Ord from "@principia/prelude/Ord";
import { toNumber } from "@principia/prelude/Ordering";

import type { Either } from "../Either";
import type { Predicate, Refinement } from "../Function";
import type { NonEmptyArray } from "../NonEmptyArray";
import type { Option } from "../Option";
import { isSome, none, some } from "../Option";
import { empty } from "./constructors";
import { reduce_ } from "./foldable";
import { isEmpty, isNonEmpty, isOutOfBound_ } from "./guards";
import { chain_ } from "./monad";

/*
 * -------------------------------------------
 * Combinators
 * -------------------------------------------
 */

export function concat_<A>(xs: ReadonlyArray<A>, ys: ReadonlyArray<A>): ReadonlyArray<A> {
  const lenx = xs.length;
  if (lenx === 0) {
    return ys;
  }
  const leny = ys.length;
  if (leny === 0) {
    return xs;
  }
  const r = Array(lenx + leny);
  for (let i = 0; i < lenx; i++) {
    r[i] = xs[i];
  }
  for (let i = 0; i < leny; i++) {
    r[i + lenx] = ys[i];
  }
  return r;
}

export function concat<A>(ys: ReadonlyArray<A>): (xs: ReadonlyArray<A>) => ReadonlyArray<A> {
  return (xs) => concat_(xs, ys);
}

export function append_<A>(as: ReadonlyArray<A>, a: A): ReadonlyArray<A> {
  return concat_(as, [a]);
}

export function append<A>(a: A): (as: ReadonlyArray<A>) => ReadonlyArray<A> {
  return (as) => append_(as, a);
}

export function lookup_<A>(i: number, as: ReadonlyArray<A>): Option<A> {
  return isOutOfBound_(i, as) ? none() : some(as[i]);
}

export function lookup(i: number): <A>(as: ReadonlyArray<A>) => Option<A> {
  return (as) => lookup_(i, as);
}

export function scanLeft<A, B>(
  b: B,
  f: (b: B, a: A) => B
): (as: ReadonlyArray<A>) => ReadonlyArray<B> {
  return (as) => {
    const l = as.length;
    const r: Array<B> = new Array(l + 1);
    r[0] = b;
    for (let i = 0; i < l; i++) {
      r[i + 1] = f(r[i], as[i]);
    }
    return r;
  };
}

export function scanRight<A, B>(
  b: B,
  f: (a: A, b: B) => B
): (as: ReadonlyArray<A>) => ReadonlyArray<B> {
  return (as) => {
    const l = as.length;
    const r: Array<B> = new Array(l + 1);
    r[l] = b;
    for (let i = l - 1; i >= 0; i--) {
      r[i] = f(as[i], r[i + 1]);
    }
    return r;
  };
}

export function cons_<A>(head: A, tail: ReadonlyArray<A>): NonEmptyArray<A> {
  const len = tail.length;
  const r = Array(len + 1);
  for (let i = 0; i < len; i++) {
    r[i + 1] = tail[i];
  }
  r[0] = head;
  return (r as unknown) as NonEmptyArray<A>;
}

export function cons<A>(tail: ReadonlyArray<A>): (head: A) => NonEmptyArray<A> {
  return (head) => cons_(head, tail);
}

export function snoc_<A>(init: ReadonlyArray<A>, end: A): NonEmptyArray<A> {
  const len = init.length;
  const r = Array(len + 1);
  for (let i = 0; i < len; i++) {
    r[i] = init[i];
  }
  r[len] = end;
  return (r as unknown) as NonEmptyArray<A>;
}

export function snoc<A>(end: A): (init: ReadonlyArray<A>) => NonEmptyArray<A> {
  return (init) => snoc_(init, end);
}

export function head<A>(as: ReadonlyArray<A>): Option<A> {
  return isEmpty(as) ? none() : some(as[0]);
}

export function tail<A>(as: ReadonlyArray<A>): Option<ReadonlyArray<A>> {
  return isEmpty(as) ? none() : some(as.slice(1));
}

export function last<A>(as: ReadonlyArray<A>): Option<A> {
  return lookup_(as.length - 1, as);
}

export function init<A>(as: ReadonlyArray<A>): Option<ReadonlyArray<A>> {
  const len = as.length;
  return len === 0 ? none() : some(as.slice(0, len - 1));
}

export function takeLeft(n: number): <A>(as: ReadonlyArray<A>) => ReadonlyArray<A> {
  return (as) => as.slice(0, n);
}

export function takeRight(n: number): <A>(as: ReadonlyArray<A>) => ReadonlyArray<A> {
  return (as) => (isEmpty(as) ? empty() : as.slice(-n));
}

const spanIndexUncurry = <A>(as: ReadonlyArray<A>, predicate: Predicate<A>): number => {
  const l = as.length;
  let i = 0;
  for (; i < l; i++) {
    if (!predicate(as[i])) {
      break;
    }
  }
  return i;
};

export function takeLeftWhile<A, B extends A>(
  refinement: Refinement<A, B>
): (as: ReadonlyArray<A>) => ReadonlyArray<B>;
export function takeLeftWhile<A>(
  predicate: Predicate<A>
): (as: ReadonlyArray<A>) => ReadonlyArray<A>;
export function takeLeftWhile<A>(
  predicate: Predicate<A>
): (as: ReadonlyArray<A>) => ReadonlyArray<A> {
  return (as) => {
    const i = spanIndexUncurry(as, predicate);
    const init = Array(i);
    for (let j = 0; j < i; j++) {
      init[j] = as[j];
    }
    return init;
  };
}

export interface Spanned<I, R> {
  readonly init: ReadonlyArray<I>;
  readonly rest: ReadonlyArray<R>;
}

export function spanLeft<A, B extends A>(
  refinement: Refinement<A, B>
): (as: ReadonlyArray<A>) => Spanned<B, A>;
export function spanLeft<A>(predicate: Predicate<A>): (as: ReadonlyArray<A>) => Spanned<A, A>;
export function spanLeft<A>(predicate: Predicate<A>): (as: ReadonlyArray<A>) => Spanned<A, A> {
  return (as) => {
    const i = spanIndexUncurry(as, predicate);
    const init = Array(i);
    for (let j = 0; j < i; j++) {
      init[j] = as[j];
    }
    const l = as.length;
    const rest = Array(l - i);
    for (let j = i; j < l; j++) {
      rest[j - i] = as[j];
    }
    return { init, rest };
  };
}

export function findLast<A, B extends A>(
  refinement: Refinement<A, B>
): (as: ReadonlyArray<A>) => Option<B>;
export function findLast<A>(predicate: Predicate<A>): (as: ReadonlyArray<A>) => Option<A>;
export function findLast<A>(predicate: Predicate<A>): (as: ReadonlyArray<A>) => Option<A> {
  return (as) => {
    const len = as.length;
    for (let i = 0; i < len; i++) {
      if (predicate(as[i])) {
        return some(as[i]);
      }
    }
    return none();
  };
}

export function findLastMap<A, B>(f: (a: A) => Option<B>): (as: ReadonlyArray<A>) => Option<B> {
  return (as) => {
    const len = as.length;
    for (let i = 0; i < len; i++) {
      const v = f(as[i]);
      if (isSome(v)) {
        return v;
      }
    }
    return none();
  };
}

export function findFirst<A, B extends A>(
  refinement: Refinement<A, B>
): (as: ReadonlyArray<A>) => Option<B>;
export function findFirst<A>(predicate: Predicate<A>): (as: ReadonlyArray<A>) => Option<A>;
export function findFirst<A>(predicate: Predicate<A>): (as: ReadonlyArray<A>) => Option<A> {
  return (as) => {
    const len = as.length;
    for (let i = len - 1; i >= 0; i--) {
      if (predicate(as[i])) {
        return some(as[i]);
      }
    }
    return none();
  };
}

export function findFirstMap<A, B>(f: (a: A) => Option<B>): (as: ReadonlyArray<A>) => Option<B> {
  return (as) => {
    const len = as.length;
    for (let i = len - 1; i >= 0; i--) {
      const v = f(as[i]);
      if (isSome(v)) {
        return v;
      }
    }
    return none();
  };
}

export function findFirstIndex_<A>(as: ReadonlyArray<A>, predicate: Predicate<A>): Option<number> {
  const len = as.length;
  for (let i = 0; i < len; i++) {
    if (predicate(as[i])) {
      return some(i);
    }
  }
  return none();
}

export function findFirstIndex<A>(
  predicate: Predicate<A>
): (as: ReadonlyArray<A>) => Option<number> {
  return (as) => findFirstIndex_(as, predicate);
}

export const findLastIndex = <A>(predicate: Predicate<A>) => (
  as: ReadonlyArray<A>
): Option<number> => {
  const len = as.length;
  for (let i = len - 1; i >= 0; i--) {
    if (predicate(as[i])) {
      return some(i);
    }
  }
  return none();
};

export function unsafeInsertAt<A>(i: number, a: A, as: ReadonlyArray<A>): ReadonlyArray<A> {
  const xs = Array.from(as);
  xs.splice(i, 0, a);
  return xs;
}

export function unsafeUpdateAt<A>(i: number, a: A, as: ReadonlyArray<A>): ReadonlyArray<A> {
  if (as[i] === a) {
    return as;
  } else {
    const xs = Array.from(as);
    xs[i] = a;
    return xs;
  }
}

export function unsafeDeleteAt<A>(i: number, as: ReadonlyArray<A>): ReadonlyArray<A> {
  const xs = Array.from(as);
  xs.splice(i, 1);
  return xs;
}

export function insertAt_<A>(as: ReadonlyArray<A>, i: number, a: A): Option<ReadonlyArray<A>> {
  return isOutOfBound_(i, as) ? none() : some(unsafeInsertAt(i, a, as));
}

export function insertAt<A>(i: number, a: A): (as: ReadonlyArray<A>) => Option<ReadonlyArray<A>> {
  return (as) => insertAt_(as, i, a);
}

export function updateAt_<A>(as: ReadonlyArray<A>, i: number, a: A): Option<ReadonlyArray<A>> {
  return isOutOfBound_(i, as) ? none() : some(unsafeUpdateAt(i, a, as));
}

export function updateAt<A>(i: number, a: A): (as: ReadonlyArray<A>) => Option<ReadonlyArray<A>> {
  return (as) => updateAt_(as, i, a);
}

export function deleteAt_<A>(as: ReadonlyArray<A>, i: number): Option<ReadonlyArray<A>> {
  return isOutOfBound_(i, as) ? none() : some(unsafeDeleteAt(i, as));
}

export function deleteAt(i: number): <A>(as: ReadonlyArray<A>) => Option<ReadonlyArray<A>> {
  return (as) => deleteAt_(as, i);
}

/**
 * Apply a function to the element at the specified index, creating a new array, or returning `None` if the index is out
 * of bounds
 *
 * @since 1.0.0
 */
export const modifyAt_ = <A>(
  as: ReadonlyArray<A>,
  i: number,
  f: (a: A) => A
): Option<ReadonlyArray<A>> =>
  isOutOfBound_(i, as) ? none() : some(unsafeUpdateAt(i, f(as[i]), as));

/**
 * Apply a function to the element at the specified index, creating a new array, or returning `None` if the index is out
 * of bounds
 *
 * @since 1.0.0
 */
export function modifyAt<A>(
  i: number,
  f: (a: A) => A
): (as: ReadonlyArray<A>) => Option<ReadonlyArray<A>> {
  return (as) => modifyAt_(as, i, f);
}

export function reverse<A>(as: ReadonlyArray<A>): ReadonlyArray<A> {
  return isEmpty(as) ? as : as.slice().reverse();
}

export function rights<E, A>(as: ReadonlyArray<Either<E, A>>): ReadonlyArray<A> {
  const rs: Array<A> = [];
  for (let i = 0; i < as.length; i++) {
    const a = as[i];
    if (a._tag === "Right") {
      rs.push(a.right);
    }
  }
  return rs;
}

export function lefts<E, A>(as: ReadonlyArray<Either<E, A>>): ReadonlyArray<E> {
  const ls: Array<E> = [];
  for (let i = 0; i < as.length; i++) {
    const a = as[i];
    if (a._tag === "Left") {
      ls.push(a.left);
    }
  }
  return ls;
}

export function sort<B>(O: Ord.Ord<B>): <A extends B>(as: readonly A[]) => readonly A[] {
  return (as) => (isEmpty(as) ? empty() : as.slice().sort((a, b) => toNumber(O.compare(a)(b))));
}

export function unzip<A, B>(
  as: ReadonlyArray<readonly [A, B]>
): readonly [ReadonlyArray<A>, ReadonlyArray<B>] {
  const fa: Array<A> = [];
  const fb: Array<B> = [];

  for (let i = 0; i < as.length; i++) {
    fa[i] = as[i][0];
    fb[i] = as[i][1];
  }

  return [fa, fb];
}

export function elem<A>(E: Eq<A>): (a: A) => (as: ReadonlyArray<A>) => boolean {
  return (a) => (as) => {
    const predicate = (element: A) => E.equals(element)(a);
    let i = 0;
    const len = as.length;
    for (; i < len; i++) {
      if (predicate(as[i])) {
        return true;
      }
    }
    return false;
  };
}

export function uniq<A>(E: Eq<A>): (as: ReadonlyArray<A>) => ReadonlyArray<A> {
  return (as) => {
    const elemS = elem(E);
    const out: Array<A> = [];
    const len = as.length;
    let i = 0;
    for (; i < len; i++) {
      const a = as[i];
      if (!elemS(a)(out)) {
        out.push(a);
      }
    }
    return len === out.length ? as : out;
  };
}

export function sortBy<B>(
  ords: ReadonlyArray<Ord.Ord<B>>
): <A extends B>(as: ReadonlyArray<A>) => ReadonlyArray<B> {
  return (as) => {
    const M = Ord.getMonoid<B>();
    return sort(reduce_(ords, M.nat, (b, a) => M.combine_(a, b)))(as);
  };
}

export function comprehension<A, B, C, D, R>(
  input: readonly [ReadonlyArray<A>, ReadonlyArray<B>, ReadonlyArray<C>, ReadonlyArray<D>],
  f: (a: A, b: B, c: C, d: D) => R,
  g?: (a: A, b: B, c: C, d: D) => boolean
): ReadonlyArray<R>;
export function comprehension<A, B, C, R>(
  input: readonly [ReadonlyArray<A>, ReadonlyArray<B>, ReadonlyArray<C>],
  f: (a: A, b: B, c: C) => R,
  g?: (a: A, b: B, c: C) => boolean
): ReadonlyArray<R>;
export function comprehension<A, B, R>(
  input: readonly [ReadonlyArray<A>, ReadonlyArray<B>],
  f: (a: A, b: B) => R,
  g?: (a: A, b: B) => boolean
): ReadonlyArray<R>;
export function comprehension<A, R>(
  input: readonly [ReadonlyArray<A>],
  f: (a: A) => boolean,
  g?: (a: A) => R
): ReadonlyArray<R>;
export function comprehension<R>(
  input: ReadonlyArray<ReadonlyArray<any>>,
  f: (...xs: ReadonlyArray<any>) => R,
  g: (...xs: ReadonlyArray<any>) => boolean = () => true
): ReadonlyArray<R> {
  const go = (
    scope: ReadonlyArray<any>,
    input: ReadonlyArray<ReadonlyArray<any>>
  ): ReadonlyArray<R> => {
    if (input.length === 0) {
      return g(...scope) ? [f(...scope)] : empty();
    } else {
      return chain_(input[0], (x) => go(snoc_(scope, x), input.slice(1)));
    }
  };
  return go(empty(), input);
}

export function union<A>(
  E: Eq<A>
): (ys: ReadonlyArray<A>) => (xs: ReadonlyArray<A>) => ReadonlyArray<A> {
  return (ys) => (xs) => {
    const elemE = elem(E);
    return concat_(
      xs,
      ys.filter((a) => !elemE(a)(xs))
    );
  };
}

export function intersection<A>(
  E: Eq<A>
): (ys: ReadonlyArray<A>) => (xs: ReadonlyArray<A>) => ReadonlyArray<A> {
  return (ys) => (xs) => {
    const elemE = elem(E);
    return xs.filter((a) => elemE(a)(ys));
  };
}

export function chop_<A, B>(
  as: ReadonlyArray<A>,
  f: (as: NonEmptyArray<A>) => readonly [B, ReadonlyArray<A>]
): ReadonlyArray<B> {
  const result: Array<B> = [];
  let cs: ReadonlyArray<A> = as;
  while (isNonEmpty(cs)) {
    const [b, c] = f(cs);
    result.push(b);
    cs = c;
  }
  return result;
}

export function chop<A, B>(
  f: (as: NonEmptyArray<A>) => readonly [B, ReadonlyArray<A>]
): (as: ReadonlyArray<A>) => ReadonlyArray<B> {
  return (as) => chop_(as, f);
}

export function splitAt(
  n: number
): <A>(as: ReadonlyArray<A>) => readonly [ReadonlyArray<A>, ReadonlyArray<A>] {
  return (as) => [as.slice(0, n), as.slice(n)];
}

export function chunksOf(n: number): <A>(as: ReadonlyArray<A>) => ReadonlyArray<ReadonlyArray<A>> {
  return (as) =>
    as.length === 0 ? empty() : isOutOfBound_(n - 1, as) ? [as] : chop_(as, splitAt(n));
}

export const difference = <A>(E: Eq<A>) => (ys: ReadonlyArray<A>) => (
  xs: ReadonlyArray<A>
): ReadonlyArray<A> => {
  const elemE = elem(E);
  return xs.filter((a) => !elemE(a)(ys));
};

export function drop_<A>(as: ReadonlyArray<A>, n: number): ReadonlyArray<A> {
  return as.slice(n, as.length);
}

export function drop(n: number): <A>(as: ReadonlyArray<A>) => ReadonlyArray<A> {
  return (as) => drop_(as, n);
}

export function dropLast_<A>(as: ReadonlyArray<A>, n: number): ReadonlyArray<A> {
  return as.slice(0, as.length - n);
}

export function dropLast(n: number): <A>(as: ReadonlyArray<A>) => ReadonlyArray<A> {
  return (as) => dropLast_(as, n);
}

export function dropWhile_<A>(as: ReadonlyArray<A>, predicate: Predicate<A>): ReadonlyArray<A> {
  const i = spanIndexUncurry(as, predicate);
  const l = as.length;
  const rest = Array(l - i);
  for (let j = i; j < l; j++) {
    rest[j - i] = as[j];
  }
  return rest;
}

export function dropWhile<A>(predicate: Predicate<A>): (as: ReadonlyArray<A>) => ReadonlyArray<A> {
  return (as) => dropWhile_(as, predicate);
}

// export function dropLastWHile_<A>(as: ReadonlyArray<A>, predicate: Predicate<A>): ReadonlyArray<A> {
//    const i = spanIndexUncurry(as, predicate);
//    const l = as.length;
//    const rest = Array(l - i);
//    for (let j = i; j < l; j++) {
//       rest[j - i] = as[j];
//    }
//    return rest;
// }

// export function dropLastWhile<A>(predicate: Predicate<A>): (as: ReadonlyArray<A>) => ReadonlyArray<A> {
//    return (as) => dropLastWHile_(as, predicate);
// }
