import * as T from "../Task/Task";
import { append_ } from "./combinators";
import { empty } from "./constructors";
import { reduce_ } from "./foldable";
import type { List } from "./model";

export function foreachTask_<A, R, E, B>(l: List<A>, f: (a: A) => T.Task<R, E, B>): T.Task<R, E, List<B>> {
   return reduce_(l, T.succeed(empty<B>()) as T.Task<R, E, List<B>>, (b, a) =>
      T.mapBoth_(
         b,
         T.suspend(() => f(a)),
         (acc, r) => append_(acc, r)
      )
   );
}

export function foreachTask<A, R, E, B>(f: (a: A) => T.Task<R, E, B>): (l: List<A>) => T.Task<R, E, List<B>> {
   return (l) => foreachTask_(l, f);
}
