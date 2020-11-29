import * as T from "../AIO/AIO";
import { pipe } from "../Function";
import { append_ } from "./combinators";
import { empty } from "./constructors";
import { reduce_ } from "./foldable";
import { mapWithIndex_ } from "./functor";

/**
 * Effectfully maps the elements of this Array.
 */
export function mapEffect_<A, R, E, B>(
  as: ReadonlyArray<A>,
  f: (a: A) => T.AIO<R, E, B>
): T.AIO<R, E, ReadonlyArray<B>> {
  return reduce_(as, T.succeed(empty()) as T.AIO<R, E, ReadonlyArray<B>>, (b, a) =>
    T.zipWith_(
      b,
      T.suspend(() => f(a)),
      append_
    )
  );
}

/**
 * Effectfully maps the elements of this Array.
 */
export function mapEffect<A, R, E, B>(
  f: (a: A) => T.AIO<R, E, B>
): (as: ReadonlyArray<A>) => T.AIO<R, E, ReadonlyArray<B>> {
  return (as) => mapEffect_(as, f);
}

/**
 * Effectfully maps the elements of this Array in parallel.
 */
export function mapEffectPar_<A, R, E, B>(
  as: ReadonlyArray<A>,
  f: (a: A) => T.AIO<R, E, B>
): T.AIO<R, E, ReadonlyArray<B>> {
  return T.chain_(
    T.total<B[]>(() => []),
    (array) => {
      function fn([a, n]: [A, number]) {
        return T.chain_(
          T.suspend(() => f(a)),
          (b) =>
            T.total(() => {
              array[n] = b;
            })
        );
      }
      return T.chain_(
        T.foreachUnitPar_(
          mapWithIndex_(as, (n, a) => [a, n] as [A, number]),
          fn
        ),
        () => T.total(() => array)
      );
    }
  );
}

/**
 * Effectfully maps the elements of this Array in parallel.
 */
export function mapEffectPar<A, R, E, B>(
  f: (a: A) => T.AIO<R, E, B>
): (as: ReadonlyArray<A>) => T.AIO<R, E, ReadonlyArray<B>> {
  return (as) => mapEffectPar_(as, f);
}

/**
 * Statefully and effectfully maps over the elements of this Array to produce
 * new elements.
 */
export function mapAccumEffect_<S, A, R, E, B>(
  as: ReadonlyArray<A>,
  s: S,
  f: (s: S, a: A) => T.AIO<R, E, readonly [S, B]>
): T.AIO<R, E, readonly [S, ReadonlyArray<B>]> {
  return T.suspend(() => {
    let dest: T.AIO<R, E, S> = T.succeed(s);
    const res: Array<B> = [];
    for (let i = 0; i < as.length; i++) {
      const v = as[i];
      dest = T.chain_(dest, (state) =>
        T.map_(f(state, v), ([s2, b]) => {
          res.push(b);
          return s2;
        })
      );
    }
    return T.map_(dest, (s) => [s, res]);
  });
}

/**
 * Statefully and effectfully maps over the elements of this Array to produce
 * new elements.
 */
export function mapAccumEffect<S, A, R, E, B>(
  s: S,
  f: (s: S, a: A) => T.AIO<R, E, readonly [S, B]>
): (as: ReadonlyArray<A>) => T.AIO<R, E, readonly [S, ReadonlyArray<B>]> {
  return (as) => mapAccumEffect_(as, s, f);
}

export function dropWhileEffect_<A, R, E>(
  as: ReadonlyArray<A>,
  p: (a: A) => T.AIO<R, E, boolean>
): T.AIO<R, E, ReadonlyArray<A>> {
  return T.suspend(() => {
    let dropping = T.succeed(true) as T.AIO<R, E, boolean>;
    const ret: Array<A> = [];
    for (let i = 0; i < as.length; i++) {
      const a = as[i];
      dropping = pipe(
        dropping,
        T.chain((d) => (d ? p(a) : T.succeed(false))),
        T.map((d) => {
          if (d) return true;
          else {
            ret.push(a);
            return false;
          }
        })
      );
    }
    return T.as_(dropping, () => ret);
  });
}
