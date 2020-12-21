import type { List } from "./model";

import { pipe } from "../Function";
import * as I from "../IO";
import { push } from "./_internal";
import { append_, forEach_ } from "./combinators";
import { empty, emptyPushable } from "./constructors";
import { reduce_ } from "./foldable";

export function foreachEffect_<A, R, E, B>(
  l: List<A>,
  f: (a: A) => I.IO<R, E, B>
): I.IO<R, E, List<B>> {
  return reduce_(l, I.succeed(empty<B>()) as I.IO<R, E, List<B>>, (b, a) =>
    I.zipWith_(
      b,
      I.suspend(() => f(a)),
      (acc, r) => append_(acc, r)
    )
  );
}

export function foreachEffect<A, R, E, B>(
  f: (a: A) => I.IO<R, E, B>
): (l: List<A>) => I.IO<R, E, List<B>> {
  return (l) => foreachEffect_(l, f);
}

export function dropWhileEffect_<A, R, E>(
  l: List<A>,
  p: (a: A) => I.IO<R, E, boolean>
): I.IO<R, E, List<A>> {
  return I.suspend(() => {
    let dropping = I.succeed(true) as I.IO<R, E, boolean>;
    const newList = emptyPushable<A>();
    forEach_(l, (a) => {
      dropping = pipe(
        dropping,
        I.chain((d) => (d ? p(a) : I.succeed(false))),
        I.map((d) => {
          if (d) return true;
          else {
            push(a, newList);
            return false;
          }
        })
      );
    });
    return I.as_(dropping, () => newList);
  });
}

export function dropWhileEffect<A, R, E>(
  p: (a: A) => I.IO<R, E, boolean>
): (l: List<A>) => I.IO<R, E, List<A>> {
  return (l) => dropWhileEffect_(l, p);
}

export function filterEffect_<A, R, E>(
  l: List<A>,
  p: (a: A) => I.IO<R, E, boolean>
): I.IO<R, E, List<A>> {
  return I.suspend(() => {
    let r = I.succeed(empty<A>()) as I.IO<R, E, List<A>>;
    forEach_(l, (a) => {
      r = I.zipWith_(r, p(a), (l, b) => (b ? append_(l, a) : l));
    });
    return r;
  });
}

export function filterEffect<A, R, E>(
  p: (a: A) => I.IO<R, E, boolean>
): (l: List<A>) => I.IO<R, E, List<A>> {
  return (l) => filterEffect_(l, p);
}
