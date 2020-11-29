import * as T from "../AIO/AIO";
import { pipe } from "../Function";
import { push } from "./_internal";
import { append_, forEach_ } from "./combinators";
import { empty, emptyPushable } from "./constructors";
import { reduce_ } from "./foldable";
import type { List } from "./model";

export function foreachEffect_<A, R, E, B>(
  l: List<A>,
  f: (a: A) => T.AIO<R, E, B>
): T.AIO<R, E, List<B>> {
  return reduce_(l, T.succeed(empty<B>()) as T.AIO<R, E, List<B>>, (b, a) =>
    T.zipWith_(
      b,
      T.suspend(() => f(a)),
      (acc, r) => append_(acc, r)
    )
  );
}

export function foreachEffect<A, R, E, B>(
  f: (a: A) => T.AIO<R, E, B>
): (l: List<A>) => T.AIO<R, E, List<B>> {
  return (l) => foreachEffect_(l, f);
}

export function dropWhileEffect_<A, R, E>(
  l: List<A>,
  p: (a: A) => T.AIO<R, E, boolean>
): T.AIO<R, E, List<A>> {
  return T.suspend(() => {
    let dropping = T.succeed(true) as T.AIO<R, E, boolean>;
    const newList = emptyPushable<A>();
    forEach_(l, (a) => {
      dropping = pipe(
        dropping,
        T.chain((d) => (d ? p(a) : T.succeed(false))),
        T.map((d) => {
          if (d) return true;
          else {
            push(a, newList);
            return false;
          }
        })
      );
    });
    return T.as_(dropping, () => newList);
  });
}

export function dropWhileEffect<A, R, E>(
  p: (a: A) => T.AIO<R, E, boolean>
): (l: List<A>) => T.AIO<R, E, List<A>> {
  return (l) => dropWhileEffect_(l, p);
}

export function filterEffect_<A, R, E>(
  l: List<A>,
  p: (a: A) => T.AIO<R, E, boolean>
): T.AIO<R, E, List<A>> {
  return T.suspend(() => {
    let r = T.succeed(empty<A>()) as T.AIO<R, E, List<A>>;
    forEach_(l, (a) => {
      r = T.zipWith_(r, p(a), (l, b) => (b ? append_(l, a) : l));
    });
    return r;
  });
}

export function filterEffect<A, R, E>(
  p: (a: A) => T.AIO<R, E, boolean>
): (l: List<A>) => T.AIO<R, E, List<A>> {
  return (l) => filterEffect_(l, p);
}
