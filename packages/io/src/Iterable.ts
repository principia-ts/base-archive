/*
 * -------------------------------------------
 * Constructors
 * -------------------------------------------
 */

import type { Either } from "@principia/base/data/Either";
import type { PredicateWithIndex } from "@principia/base/data/Function";
import type { Monoid } from "@principia/base/Monoid";
import type { Separated } from "@principia/base/util/types";

import * as A from "@principia/base/data/Array";
import { identity } from "@principia/base/data/Function";

export function* genOf<A>(a: A) {
  yield a;
}

export const never: Iterable<never> = {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  *[Symbol.iterator]() {}
};

export function iterable<A>(iterator: () => IterableIterator<A>): Iterable<A> {
  return {
    [Symbol.iterator]() {
      return iterator();
    }
  };
}

/*
 * -------------------------------------------
 * Apply
 * -------------------------------------------
 */

export function zipWith_<A, B, C>(
  fa: Iterable<A>,
  fb: Iterable<B>,
  f: (a: A, b: B) => C
): Iterable<C> {
  return {
    [Symbol.iterator]() {
      let done = false;
      const ia = fa[Symbol.iterator]();
      const ib = fb[Symbol.iterator]();
      return {
        next() {
          if (done) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            return this.return!();
          }

          const va = ia.next();
          const vb = ib.next();

          return va.done || vb.done
            ? // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
              this.return!()
            : { done: false, value: f(va.value, vb.value) };
        },
        return(value?: unknown) {
          if (!done) {
            done = true;

            if (typeof ia.return === "function") {
              ia.return();
            }
            if (typeof ib.return === "function") {
              ib.return();
            }
          }

          return { done: true, value };
        }
      };
    }
  };
}

export function ap_<A, B>(fab: Iterable<(a: A) => B>, fa: Iterable<A>): Iterable<B> {
  return chain_(fab, (f) => map_(fa, f));
}

export function ap<A>(fa: Iterable<A>): <B>(fab: Iterable<(a: A) => B>) => Iterable<B> {
  return (fab) => ap_(fab, fa);
}

export function pure<A>(a: A): Iterable<A> {
  return iterable(function* () {
    yield a;
  });
}

export function zip<B>(fb: Iterable<B>): <A>(fa: Iterable<A>) => Iterable<readonly [A, B]> {
  return (fa) => zipWith_(fa, fb, (a, b) => [a, b] as const);
}

export function zip_<A, B>(fa: Iterable<A>, fb: Iterable<B>): Iterable<readonly [A, B]> {
  return zipWith_(fa, fb, (a, b) => [a, b] as const);
}

/*
 * -------------------------------------------
 * Filterable
 * -------------------------------------------
 */

export function filterWithIndex_<A>(
  fa: Iterable<A>,
  predicate: PredicateWithIndex<number, A>
): Iterable<A> {
  return iterable(function* () {
    let i = -1;
    const iterator = fa[Symbol.iterator]();
    while (true) {
      const result = iterator.next();
      if (result.done) break;
      i += 1;
      if (predicate(i, result.value)) yield result.value;
    }
  });
}

export function partitionMapWithIndex_<A, B, C>(
  fa: Iterable<A>,
  f: (i: number, a: A) => Either<B, C>
): Separated<Iterable<B>, Iterable<C>> {
  const mapped = mapWithIndex_(fa, f);
  return {
    left: iterable(function* () {
      const iterator = mapped[Symbol.iterator]();
      while (true) {
        const result = iterator.next();
        if (result.done) break;
        if (result.value._tag === "Left") yield result.value.left;
      }
    }),
    right: iterable(function* () {
      const iterator = mapped[Symbol.iterator]();
      while (true) {
        const result = iterator.next();
        if (result.done) break;
        if (result.value._tag === "Right") yield result.value.right;
      }
    })
  };
}

export function partitionMap<A, B, C>(
  f: (a: A) => Either<B, C>
): (as: Iterable<A>) => Separated<Iterable<B>, Iterable<C>> {
  return (as) => partitionMapWithIndex_(as, (_, a) => f(a));
}

/*
 * -------------------------------------------
 * Foldable
 * -------------------------------------------
 */

export function foldMapWithIndex_<M>(
  M: Monoid<M>
): <A>(fa: Iterable<A>, f: (i: number, a: A) => M) => M {
  return (fa, f) => {
    let res = M.nat;
    let n = -1;
    const iterator = fa[Symbol.iterator]();
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const result = iterator.next();
      if (result.done) {
        break;
      }
      n += 1;
      res = M.combine_(res, f(n, result.value));
    }
    return res;
  };
}

export function foldMapWithIndex<M>(
  M: Monoid<M>
): <A>(f: (i: number, a: A) => M) => (fa: Iterable<A>) => M {
  return (f) => (fa) => foldMapWithIndex_(M)(fa, f);
}

export function foldMap_<M>(M: Monoid<M>): <A>(fa: Iterable<A>, f: (a: A) => M) => M {
  return (fa, f) => foldMapWithIndex_(M)(fa, (_, a) => f(a));
}

export function foldMap<M>(M: Monoid<M>): <A>(f: (a: A) => M) => (fa: Iterable<A>) => M {
  return (f) => (fa) => foldMap_(M)(fa, f);
}

export function foldLeftWithIndex_<A, B>(
  fa: Iterable<A>,
  b: B,
  f: (i: number, b: B, a: A) => B
): B {
  let res = b;
  let n = -1;
  const iterator = fa[Symbol.iterator]();
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const result = iterator.next();
    if (result.done) {
      break;
    }
    n += 1;
    res = f(n, res, result.value);
  }
  return res;
}

export function foldLeftWithIndex<A, B>(
  b: B,
  f: (i: number, b: B, a: A) => B
): (fa: Iterable<A>) => B {
  return (fa) => foldLeftWithIndex_(fa, b, f);
}

export function foldLeft_<A, B>(fa: Iterable<A>, b: B, f: (b: B, a: A) => B): B {
  return foldLeftWithIndex_(fa, b, (_, b, a) => f(b, a));
}

export function foldLeft<A, B>(b: B, f: (b: B, a: A) => B): (fa: Iterable<A>) => B {
  return (fa) => foldLeft_(fa, b, f);
}

export function foldRightWithIndex<A, B>(
  b: B,
  f: (i: number, a: A, b: B) => B
): (fa: Iterable<A>) => B {
  return (fa) => A.foldRightWithIndex_(Array.from(fa), b, f);
}

export function foldRightWithIndex_<A, B>(
  fa: Iterable<A>,
  b: B,
  f: (i: number, a: A, b: B) => B
): B {
  return A.foldRightWithIndex_(Array.from(fa), b, f);
}

/*
 * -------------------------------------------
 * Functor
 * -------------------------------------------
 */

function* genMap<A, B>(ia: Iterator<A>, f: (i: number, a: A) => B) {
  let n = -1;
  while (true) {
    const result = ia.next();
    if (result.done) {
      break;
    }
    n += 1;
    yield f(n, result.value);
  }
}

export function mapWithIndex_<A, B>(fa: Iterable<A>, f: (i: number, a: A) => B): Iterable<B> {
  return {
    [Symbol.iterator]: () => genMap(fa[Symbol.iterator](), f)
  };
}

export function mapWithIndex<A, B>(f: (i: number, a: A) => B): (fa: Iterable<A>) => Iterable<B> {
  return (fa) => ({
    [Symbol.iterator]: () => genMap(fa[Symbol.iterator](), f)
  });
}

export function map_<A, B>(fa: Iterable<A>, f: (a: A) => B): Iterable<B> {
  return mapWithIndex_(fa, (_, a) => f(a));
}

export function map<A, B>(f: (a: A) => B): (fa: Iterable<A>) => Iterable<B> {
  return (fa) => map_(fa, f);
}

/*
 * -------------------------------------------
 * Monad
 * -------------------------------------------
 */

export function chain<A, B>(f: (a: A) => Iterable<B>): (ma: Iterable<A>) => Iterable<B> {
  return (ma) => chain_(ma, f);
}

export function chain_<A, B>(ma: Iterable<A>, f: (a: A) => Iterable<B>): Iterable<B> {
  return iterable(function* () {
    yield* genChain(ma[Symbol.iterator](), f);
  });
}

export function flatten<A>(mma: Iterable<Iterable<A>>): Iterable<A> {
  return chain_(mma, identity);
}

function* genChain<A, B>(ia: Iterator<A>, f: (a: A) => Iterable<B>) {
  while (true) {
    const result = ia.next();
    if (result.done) {
      break;
    }
    const ib = f(result.value)[Symbol.iterator]();
    while (true) {
      const result = ib.next();
      if (result.done) {
        break;
      }
      yield result.value;
    }
  }
}

/*
 * -------------------------------------------
 * Unit
 * -------------------------------------------
 */

export function unit(): Iterable<void> {
  return iterable(function* () {
    yield undefined;
  });
}

/*
 * -------------------------------------------
 * Combinators
 * -------------------------------------------
 */

export function* genConcat<A>(ia: Iterator<A>, ib: Iterator<A>) {
  while (true) {
    const result = ia.next();
    if (result.done) {
      break;
    }
    yield result.value;
  }
  while (true) {
    const result = ib.next();
    if (result.done) {
      break;
    }
    yield result.value;
  }
}

export function concat_<A>(fa: Iterable<A>, fb: Iterable<A>): Iterable<A> {
  return {
    [Symbol.iterator]: () => genConcat(fa[Symbol.iterator](), fb[Symbol.iterator]())
  };
}

export function take_<A>(fa: Iterable<A>, n: number): Iterable<A> {
  return iterable(function* () {
    const ia = fa[Symbol.iterator]();

    for (let i = 0; i <= n; i++) {
      const el = ia.next();
      if (el.done) break;
      yield el.value;
    }
  });
}

export function take(n: number): <A>(fa: Iterable<A>) => Iterable<A> {
  return (fa) => take_(fa, n);
}

export function toArray<A>(fa: Iterable<A>): ReadonlyArray<A> {
  const as: A[] = [];
  const iterator = fa[Symbol.iterator]();
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const result = iterator.next();
    if (result.done) break;
    as.push(result.value);
  }
  return as;
}
