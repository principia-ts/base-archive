import { pipe } from "../Function";
import * as I from "../IO";
import { append_ } from "./combinators";
import { empty } from "./constructors";
import { reduce_ } from "./foldable";
import { mapWithIndex_ } from "./functor";

/**
 * Effectfully maps the elements of this Array.
 */
export function mapEffect_<A, R, E, B>(
  as: ReadonlyArray<A>,
  f: (a: A) => I.IO<R, E, B>
): I.IO<R, E, ReadonlyArray<B>> {
  return reduce_(as, I.succeed(empty()) as I.IO<R, E, ReadonlyArray<B>>, (b, a) =>
    I.zipWith_(
      b,
      I.suspend(() => f(a)),
      append_
    )
  );
}

/**
 * Effectfully maps the elements of this Array.
 */
export function mapEffect<A, R, E, B>(
  f: (a: A) => I.IO<R, E, B>
): (as: ReadonlyArray<A>) => I.IO<R, E, ReadonlyArray<B>> {
  return (as) => mapEffect_(as, f);
}

/**
 * Effectfully maps the elements of this Array in parallel.
 */
export function mapEffectPar_<A, R, E, B>(
  as: ReadonlyArray<A>,
  f: (a: A) => I.IO<R, E, B>
): I.IO<R, E, ReadonlyArray<B>> {
  return I.chain_(
    I.total<B[]>(() => []),
    (array) => {
      function fn([a, n]: [A, number]) {
        return I.chain_(
          I.suspend(() => f(a)),
          (b) =>
            I.total(() => {
              array[n] = b;
            })
        );
      }
      return I.chain_(
        I.foreachUnitPar_(
          mapWithIndex_(as, (n, a) => [a, n] as [A, number]),
          fn
        ),
        () => I.total(() => array)
      );
    }
  );
}

/**
 * Effectfully maps the elements of this Array in parallel.
 */
export function mapEffectPar<A, R, E, B>(
  f: (a: A) => I.IO<R, E, B>
): (as: ReadonlyArray<A>) => I.IO<R, E, ReadonlyArray<B>> {
  return (as) => mapEffectPar_(as, f);
}

/**
 * Statefully and effectfully maps over the elements of this Array to produce
 * new elements.
 */
export function mapAccumEffect_<S, A, R, E, B>(
  as: ReadonlyArray<A>,
  s: S,
  f: (s: S, a: A) => I.IO<R, E, readonly [S, B]>
): I.IO<R, E, readonly [S, ReadonlyArray<B>]> {
  return I.suspend(() => {
    let dest: I.IO<R, E, S> = I.succeed(s);
    const res: Array<B> = [];
    for (let i = 0; i < as.length; i++) {
      const v = as[i];
      dest = I.chain_(dest, (state) =>
        I.map_(f(state, v), ([s2, b]) => {
          res.push(b);
          return s2;
        })
      );
    }
    return I.map_(dest, (s) => [s, res]);
  });
}

/**
 * Statefully and effectfully maps over the elements of this Array to produce
 * new elements.
 */
export function mapAccumEffect<S, A, R, E, B>(
  s: S,
  f: (s: S, a: A) => I.IO<R, E, readonly [S, B]>
): (as: ReadonlyArray<A>) => I.IO<R, E, readonly [S, ReadonlyArray<B>]> {
  return (as) => mapAccumEffect_(as, s, f);
}

export function dropWhileEffect_<A, R, E>(
  as: ReadonlyArray<A>,
  p: (a: A) => I.IO<R, E, boolean>
): I.IO<R, E, ReadonlyArray<A>> {
  return I.suspend(() => {
    let dropping = I.succeed(true) as I.IO<R, E, boolean>;
    const ret: Array<A> = [];
    for (let i = 0; i < as.length; i++) {
      const a = as[i];
      dropping = pipe(
        dropping,
        I.chain((d) => (d ? p(a) : I.succeed(false))),
        I.map((d) => {
          if (d) return true;
          else {
            ret.push(a);
            return false;
          }
        })
      );
    }
    return I.as_(dropping, () => ret);
  });
}
