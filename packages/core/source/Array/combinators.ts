import { Either } from "../Either";
import { Eq } from "../Eq";
import { Predicate, Refinement } from "../Function";
import { isJust, just, Maybe, nothing } from "../Maybe";
import { NonEmptyArray } from "../NonEmptyArray";
import * as Ord from "../Ord";
import { toNumber } from "../Ordering";
import { empty } from "./constructors";
import { _isOutOfBound, isEmpty, isNonEmpty } from "./guards";
import { _chain, _reduce } from "./methods";

/*
 * -------------------------------------------
 * Combinators
 * -------------------------------------------
 */

export const _append = <A>(xs: ReadonlyArray<A>, ys: ReadonlyArray<A>): ReadonlyArray<A> => {
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
};

export const append = <A>(ys: ReadonlyArray<A>) => (xs: ReadonlyArray<A>): ReadonlyArray<A> => _append(xs, ys);

export const _lookup = <A>(i: number, as: ReadonlyArray<A>): Maybe<A> =>
   _isOutOfBound(i, as) ? nothing() : just(as[i]);

export const lookup = (i: number) => <A>(as: ReadonlyArray<A>): Maybe<A> => _lookup(i, as);

export const scanl = <A, B>(b: B, f: (b: B, a: A) => B) => (as: ReadonlyArray<A>): ReadonlyArray<B> => {
   const l = as.length;
   const r: Array<B> = new Array(l + 1);
   r[0] = b;
   for (let i = 0; i < l; i++) {
      r[i + 1] = f(r[i], as[i]);
   }
   return r;
};

export const scanr = <A, B>(b: B, f: (a: A, b: B) => B) => (as: ReadonlyArray<A>): ReadonlyArray<B> => {
   const l = as.length;
   const r: Array<B> = new Array(l + 1);
   r[l] = b;
   for (let i = l - 1; i >= 0; i--) {
      r[i] = f(as[i], r[i + 1]);
   }
   return r;
};

export const cons = <A>(head: A) => (tail: ReadonlyArray<A>): NonEmptyArray<A> => {
   const len = tail.length;
   const r = Array(len + 1);
   for (let i = 0; i < len; i++) {
      r[i + 1] = tail[i];
   }
   r[0] = head;
   return (r as unknown) as NonEmptyArray<A>;
};

export const snoc = <A>(end: A) => (init: ReadonlyArray<A>): NonEmptyArray<A> => {
   const len = init.length;
   const r = Array(len + 1);
   for (let i = 0; i < len; i++) {
      r[i] = init[i];
   }
   r[len] = end;
   return (r as unknown) as NonEmptyArray<A>;
};

export const head = <A>(as: ReadonlyArray<A>): Maybe<A> => (isEmpty(as) ? nothing() : just(as[0]));

export const tail = <A>(as: ReadonlyArray<A>): Maybe<ReadonlyArray<A>> => (isEmpty(as) ? nothing() : just(as.slice(1)));

export const last = <A>(as: ReadonlyArray<A>): Maybe<A> => _lookup(as.length - 1, as);

export const init = <A>(as: ReadonlyArray<A>): Maybe<ReadonlyArray<A>> => {
   const len = as.length;
   return len === 0 ? nothing() : just(as.slice(0, len - 1));
};

export const takel = (n: number) => <A>(as: ReadonlyArray<A>): ReadonlyArray<A> => as.slice(0, n);

export const taker = (n: number) => <A>(as: ReadonlyArray<A>): ReadonlyArray<A> =>
   isEmpty(as) ? empty() : as.slice(-n);

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

export const takelWhile: {
   <A, B extends A>(refinement: Refinement<A, B>): (as: ReadonlyArray<A>) => ReadonlyArray<B>;
   <A>(predicate: Predicate<A>): (as: ReadonlyArray<A>) => ReadonlyArray<A>;
} = <A>(predicate: Predicate<A>) => (as: ReadonlyArray<A>) => {
   const i = spanIndexUncurry(as, predicate);
   const init = Array(i);
   for (let j = 0; j < i; j++) {
      init[j] = as[j];
   }
   return init;
};

export interface Spanned<I, R> {
   readonly init: ReadonlyArray<I>;
   readonly rest: ReadonlyArray<R>;
}

export const spanl: {
   <A, B extends A>(refinement: Refinement<A, B>): (as: ReadonlyArray<A>) => Spanned<B, A>;
   <A>(predicate: Predicate<A>): (as: ReadonlyArray<A>) => Spanned<A, A>;
} = <A>(predicate: Predicate<A>) => (as: ReadonlyArray<A>): Spanned<A, A> => {
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

export const dropl = (n: number) => <A>(as: ReadonlyArray<A>): ReadonlyArray<A> => as.slice(n, as.length);

export const dropr = (n: number) => <A>(as: ReadonlyArray<A>): ReadonlyArray<A> => as.slice(0, as.length - n);

export const droprWhile = <A>(predicate: Predicate<A>) => (as: ReadonlyArray<A>): ReadonlyArray<A> => {
   const i = spanIndexUncurry(as, predicate);
   const l = as.length;
   const rest = Array(l - i);
   for (let j = i; j < l; j++) {
      rest[j - i] = as[j];
   }
   return rest;
};

export const findr: {
   <A, B extends A>(refinement: Refinement<A, B>): (as: ReadonlyArray<A>) => Maybe<B>;
   <A>(predicate: Predicate<A>): (as: ReadonlyArray<A>) => Maybe<A>;
} = <A>(predicate: Predicate<A>) => (as: ReadonlyArray<A>): Maybe<A> => {
   const len = as.length;
   for (let i = 0; i < len; i++) {
      if (predicate(as[i])) {
         return just(as[i]);
      }
   }
   return nothing();
};

export const findrMap = <A, B>(f: (a: A) => Maybe<B>) => (as: ReadonlyArray<A>): Maybe<B> => {
   const len = as.length;
   for (let i = 0; i < len; i++) {
      const v = f(as[i]);
      if (isJust(v)) {
         return v;
      }
   }
   return nothing();
};

export const findl: {
   <A, B extends A>(refinement: Refinement<A, B>): (as: ReadonlyArray<A>) => Maybe<B>;
   <A>(predicate: Predicate<A>): (as: ReadonlyArray<A>) => Maybe<A>;
} = <A>(predicate: Predicate<A>) => (as: ReadonlyArray<A>): Maybe<A> => {
   const len = as.length;
   for (let i = len - 1; i >= 0; i--) {
      if (predicate(as[i])) {
         return just(as[i]);
      }
   }
   return nothing();
};

export const findlMap = <A, B>(f: (a: A) => Maybe<B>) => (as: ReadonlyArray<A>): Maybe<B> => {
   const len = as.length;
   for (let i = len - 1; i >= 0; i--) {
      const v = f(as[i]);
      if (isJust(v)) {
         return v;
      }
   }
   return nothing();
};

export const _findlIndex = <A>(as: ReadonlyArray<A>, predicate: Predicate<A>): Maybe<number> => {
   const len = as.length;
   for (let i = 0; i < len; i++) {
      if (predicate(as[i])) {
         return just(i);
      }
   }
   return nothing();
};

export const findlIndex = <A>(predicate: Predicate<A>) => (as: ReadonlyArray<A>): Maybe<number> =>
   _findlIndex(as, predicate);

export const findrIndex = <A>(predicate: Predicate<A>) => (as: ReadonlyArray<A>): Maybe<number> => {
   const len = as.length;
   for (let i = len - 1; i >= 0; i--) {
      if (predicate(as[i])) {
         return just(i);
      }
   }
   return nothing();
};

export const unsafeInsertAt = <A>(i: number, a: A, as: ReadonlyArray<A>): ReadonlyArray<A> => {
   const xs = Array.from(as);
   xs.splice(i, 0, a);
   return xs;
};

export const unsafeUpdateAt = <A>(i: number, a: A, as: ReadonlyArray<A>): ReadonlyArray<A> => {
   if (as[i] === a) {
      return as;
   } else {
      const xs = Array.from(as);
      xs[i] = a;
      return xs;
   }
};

export const unsafeDeleteAt = <A>(i: number, as: ReadonlyArray<A>): ReadonlyArray<A> => {
   const xs = Array.from(as);
   xs.splice(i, 1);
   return xs;
};

export const insertAt = <A>(i: number, a: A) => (as: ReadonlyArray<A>): Maybe<ReadonlyArray<A>> =>
   _isOutOfBound(i, as) ? nothing() : just(unsafeInsertAt(i, a, as));

export const updateAt = <A>(i: number, a: A) => (as: ReadonlyArray<A>): Maybe<ReadonlyArray<A>> =>
   _isOutOfBound(i, as) ? nothing() : just(unsafeUpdateAt(i, a, as));

export const deleteAt = (i: number) => <A>(as: ReadonlyArray<A>): Maybe<ReadonlyArray<A>> =>
   _isOutOfBound(i, as) ? nothing() : just(unsafeDeleteAt(i, as));

export const reverse = <A>(as: ReadonlyArray<A>): ReadonlyArray<A> => (isEmpty(as) ? as : as.slice().reverse());

export const rights = <E, A>(as: ReadonlyArray<Either<E, A>>): ReadonlyArray<A> => {
   const rs: Array<A> = [];
   for (let i = 0; i < as.length; i++) {
      const a = as[i];
      if (a._tag === "Right") {
         rs.push(a.right);
      }
   }
   return rs;
};

export const lefts = <E, A>(as: ReadonlyArray<Either<E, A>>): ReadonlyArray<E> => {
   const ls: Array<E> = [];
   for (let i = 0; i < as.length; i++) {
      const a = as[i];
      if (a._tag === "Left") {
         ls.push(a.left);
      }
   }
   return ls;
};

export const sort = <B>(O: Ord.Ord<B>) => <A extends B>(as: ReadonlyArray<A>): ReadonlyArray<A> =>
   isEmpty(as) ? empty() : as.slice().sort((a, b) => toNumber(O.compare(a)(b)));

export const unzip = <A, B>(as: ReadonlyArray<readonly [A, B]>): readonly [ReadonlyArray<A>, ReadonlyArray<B>] => {
   const fa: Array<A> = [];
   const fb: Array<B> = [];

   for (let i = 0; i < as.length; i++) {
      fa[i] = as[i][0];
      fb[i] = as[i][1];
   }

   return [fa, fb];
};

export const elem = <A>(E: Eq<A>) => (a: A) => (as: ReadonlyArray<A>): boolean => {
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

export const uniq = <A>(E: Eq<A>) => (as: ReadonlyArray<A>): ReadonlyArray<A> => {
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

export const sortBy = <B>(ords: ReadonlyArray<Ord.Ord<B>>) => <A extends B>(as: ReadonlyArray<A>): ReadonlyArray<A> => {
   const M = Ord.getMonoid<B>();
   return sort(_reduce(ords, M.empty, (b, a) => M.concat(b)(a)))(as);
};

export const comprehension: {
   <A, B, C, D, R>(
      input: readonly [ReadonlyArray<A>, ReadonlyArray<B>, ReadonlyArray<C>, ReadonlyArray<D>],
      f: (a: A, b: B, c: C, d: D) => R,
      g?: (a: A, b: B, c: C, d: D) => boolean
   ): ReadonlyArray<R>;
   <A, B, C, R>(
      input: readonly [ReadonlyArray<A>, ReadonlyArray<B>, ReadonlyArray<C>],
      f: (a: A, b: B, c: C) => R,
      g?: (a: A, b: B, c: C) => boolean
   ): ReadonlyArray<R>;
   <A, B, R>(
      input: readonly [ReadonlyArray<A>, ReadonlyArray<B>],
      f: (a: A, b: B) => R,
      g?: (a: A, b: B) => boolean
   ): ReadonlyArray<R>;
   <A, R>(input: readonly [ReadonlyArray<A>], f: (a: A) => boolean, g?: (a: A) => R): ReadonlyArray<R>;
} = <R>(
   input: ReadonlyArray<ReadonlyArray<any>>,
   f: (...xs: ReadonlyArray<any>) => R,
   g: (...xs: ReadonlyArray<any>) => boolean = () => true
): ReadonlyArray<R> => {
   const go = (scope: ReadonlyArray<any>, input: ReadonlyArray<ReadonlyArray<any>>): ReadonlyArray<R> => {
      if (input.length === 0) {
         return g(...scope) ? [f(...scope)] : empty();
      } else {
         return _chain(input[0], (x) => go(snoc(x)(scope), input.slice(1)));
      }
   };
   return go(empty(), input);
};

export const union = <A>(E: Eq<A>) => (ys: ReadonlyArray<A>) => (xs: ReadonlyArray<A>): ReadonlyArray<A> => {
   const elemE = elem(E);
   return _append(
      xs,
      ys.filter((a) => !elemE(a)(xs))
   );
};

export const intersection = <A>(E: Eq<A>) => (ys: ReadonlyArray<A>) => (xs: ReadonlyArray<A>): ReadonlyArray<A> => {
   const elemE = elem(E);
   return xs.filter((a) => elemE(a)(ys));
};

export const _chop = <A, B>(
   as: ReadonlyArray<A>,
   f: (as: NonEmptyArray<A>) => readonly [B, ReadonlyArray<A>]
): ReadonlyArray<B> => {
   const result: Array<B> = [];
   let cs: ReadonlyArray<A> = as;
   while (isNonEmpty(cs)) {
      const [b, c] = f(cs);
      result.push(b);
      cs = c;
   }
   return result;
};

export const chop = <A, B>(f: (as: NonEmptyArray<A>) => readonly [B, ReadonlyArray<A>]) => (
   as: ReadonlyArray<A>
): ReadonlyArray<B> => _chop(as, f);

export const splitAt = (n: number) => <A>(as: ReadonlyArray<A>): readonly [ReadonlyArray<A>, ReadonlyArray<A>] => [
   as.slice(0, n),
   as.slice(n)
];

export const chunksOf = (n: number) => <A>(as: ReadonlyArray<A>): ReadonlyArray<ReadonlyArray<A>> =>
   as.length === 0 ? empty() : _isOutOfBound(n - 1, as) ? [as] : _chop(as, splitAt(n));

export const difference = <A>(E: Eq<A>) => (ys: ReadonlyArray<A>) => (xs: ReadonlyArray<A>): ReadonlyArray<A> => {
   const elemE = elem(E);
   return xs.filter((a) => !elemE(a)(ys));
};

export const _dropLeft = <A>(as: ReadonlyArray<A>, n: number): ReadonlyArray<A> => as.slice(n, as.length);

export const dropLeft = (n: number) => <A>(as: ReadonlyArray<A>): ReadonlyArray<A> => _dropLeft(as, n);

export const _dropRight = <A>(as: ReadonlyArray<A>, n: number): ReadonlyArray<A> => as.slice(0, as.length - n);

export const dropRight = (n: number) => <A>(as: ReadonlyArray<A>): ReadonlyArray<A> => _dropRight(as, n);

export const _dropLeftWhile = <A>(as: ReadonlyArray<A>, predicate: Predicate<A>): ReadonlyArray<A> => {
   const i = spanIndexUncurry(as, predicate);
   const l = as.length;
   const rest = Array(l - i);
   for (let j = i; j < l; j++) {
      rest[j - i] = as[j];
   }
   return rest;
};

export const dropLeftWhile = <A>(predicate: Predicate<A>) => (as: ReadonlyArray<A>): ReadonlyArray<A> =>
   _dropLeftWhile(as, predicate);
