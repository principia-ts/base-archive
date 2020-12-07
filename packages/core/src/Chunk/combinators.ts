import * as A from "../Array";
import type { Predicate, Refinement } from "../Function";
import { pipe } from "../Function";
import * as I from "../IO";
import * as O from "../Option";
import { fromBuffer } from "./constructors";
import { isEmpty, isTyped } from "./guards";
import type { Chunk } from "./model";

export function drop_<A>(as: Chunk<A>, n: number): Chunk<A> {
  if (isTyped(as)) {
    return fromBuffer(as.subarray(n, as.length));
  }
  if (Array.isArray(as)) {
    return A.drop_(as, n);
  }
  return A.drop_(Array.from(as), n);
}

export function drop(n: number): <A>(as: Chunk<A>) => Chunk<A> {
  return (as) => drop_(as, n);
}

export function splitAt_<A>(as: Chunk<A>, n: number): readonly [Chunk<A>, Chunk<A>] {
  if (isTyped(as)) {
    return [fromBuffer(as.subarray(0, n)), fromBuffer(as.subarray(n))];
  }
  if (Array && Array.isArray(as)) {
    return [as.slice(0, n), as.slice(n)];
  }
  const as_ = Array.from(as);
  return [as_.slice(0, n), as_.slice(n)];
}

export function splitAt(n: number): <A>(as: Chunk<A>) => readonly [Chunk<A>, Chunk<A>] {
  return (as) => splitAt_(as, n);
}

export function concat_<A>(xs: Chunk<A>, ys: Chunk<A>): Chunk<A> {
  if (isEmpty(xs)) {
    return ys;
  }

  if (isEmpty(ys)) {
    return xs;
  }

  if (Buffer && Buffer.isBuffer(xs) && Buffer.isBuffer(ys)) {
    return fromBuffer(Buffer.concat([xs, ys]));
  }

  if (isTyped(xs) && xs.constructor === ys.constructor) {
    // @ts-expect-error
    const c = new xs.constructor(xs.length + ys.length);
    c.set(xs);
    c.set(ys, xs.length);
    return c;
  }

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

export function concat<A>(ys: Chunk<A>): (xs: Chunk<A>) => Chunk<A> {
  return (xs) => concat_(xs, ys);
}

export const spanIndex_ = <A>(as: Chunk<A>, predicate: Predicate<A>): number => {
  const l = as.length;
  let i = 0;
  for (; i < l; i++) {
    if (!predicate(as[i])) {
      break;
    }
  }
  return i;
};

export function spanIndex<A>(predicate: Predicate<A>): (as: Chunk<A>) => number {
  return (as) => spanIndex_(as, predicate);
}

export function dropWhile_<A>(as: Chunk<A>, predicate: Predicate<A>): Chunk<A> {
  const i = spanIndex_(as, predicate);
  if (isTyped(as)) {
    return fromBuffer(as.slice(i, as.length));
  }
  const l = as.length;
  const rest = Array(l - i);
  for (let j = i; j < l; j++) {
    rest[j - i] = as[j];
  }
  return rest;
}

export function dropWhile<A>(predicate: Predicate<A>): (as: Chunk<A>) => Chunk<A> {
  return (as) => dropWhile_(as, predicate);
}

export function collectWhileMap_<A, B>(as: Chunk<A>, f: (x: A) => O.Option<B>): Chunk<B> {
  const result: B[] = [];

  for (let i = 0; i < as.length; i++) {
    const o = f(as[i]);

    if (O.isSome(o)) {
      result.push(o.value);
    } else {
      break;
    }
  }

  return result;
}

export function collectWhileMap<A, B>(f: (a: A) => O.Option<B>): (as: Chunk<A>) => Chunk<B> {
  return (as) => collectWhileMap_(as, f);
}

export function collectWhile_<A, B extends A>(as: Chunk<A>, f: Refinement<A, B>): Chunk<B>;
export function collectWhile_<A>(as: Chunk<A>, f: Predicate<A>): Chunk<A>;
export function collectWhile_<A>(as: Chunk<A>, f: Predicate<A>): Chunk<A> {
  let j = as.length;
  for (let i = 0; i < as.length; i++) {
    if (!f(as[i])) {
      j = i;
      break;
    }
  }

  if (isTyped(as)) {
    return fromBuffer(as.subarray(0, j));
  }
  if (Array && Array.isArray(as)) {
    return as.slice(0, j);
  }
  return Array.from(as).slice(0, j);
}

export function collectWhile<A, B extends A>(f: Refinement<A, B>): (as: Chunk<A>) => Chunk<B>;
export function collectWhile<A>(f: Predicate<A>): (as: Chunk<A>) => Chunk<A>;
export function collectWhile<A>(f: Predicate<A>): (as: Chunk<A>) => Chunk<A> {
  return (as) => collectWhile_(as, f);
}

export function takeLeft_<A>(as: Chunk<A>, n: number): Chunk<A> {
  if (Buffer && Buffer.isBuffer(as)) {
    return fromBuffer(as.subarray(0, n));
  }
  if (Array.isArray(as)) {
    return as.slice(0, n);
  }
  return Array.from(as).slice(0, n);
}

export function takeLeft(n: number): <A>(as: Chunk<A>) => Chunk<A> {
  return (as) => takeLeft_(as, n);
}

export function append_<A>(as: Chunk<A>, a: A): Chunk<A> {
  if (Buffer && Buffer.isBuffer(as)) {
    const b = Buffer.alloc(as.length + 1);
    as.copy(b, 0, 0, as.length);
    b[as.length] = a as any;
    return fromBuffer(b);
  }
  if (Array.isArray(as)) {
    return A.append_(as, a);
  }
  return A.append_(A.from(as), a);
}

export function append<A>(a: A): (as: Chunk<A>) => Chunk<A> {
  return (as) => append_(as, a);
}

export function dropWhileEffect_<A, R, E>(
  as: Chunk<A>,
  p: (a: A) => I.IO<R, E, boolean>
): I.IO<R, E, Chunk<A>> {
  return I.suspend(() => {
    let dropping = I.succeed(true) as I.IO<R, E, boolean>;
    let ret: Chunk<any> = isTyped(as) ? Buffer.alloc(0) : ([] as A[]);

    for (let i = 0; i < as.length; i++) {
      const a = as[i];
      dropping = pipe(
        dropping,
        I.chain((d) => (d ? p(a) : I.succeed(false))),
        I.map((d) => {
          if (d) return true;
          else {
            ret = append_(ret, a);
            return false;
          }
        })
      );
    }
    return I.as_(dropping, () => ret);
  });
}
