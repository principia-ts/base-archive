import { pipe } from "../Function";
import * as T from "../Task/Task";
import * as XR from "../Task/XRef";
import { append_, cloneList, concat_, forEach_ } from "./combinators";
import { empty, emptyPushable, from } from "./constructors";
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

export function dropWhileTask_<A, R, E>(l: List<A>, p: (a: A) => T.Task<R, E, boolean>): T.Task<R, E, List<A>> {
   return T.suspend(() => {
      let dropping = T.succeed(true) as T.Task<R, E, boolean>;
      const array = [] as A[];
      forEach_(l, (a) => {
         dropping = pipe(
            dropping,
            T.chain((d) => (d ? p(a) : T.succeed(false))),
            T.map((d) => {
               if (d) return true;
               else {
                  array.push(a);
                  return false;
               }
            })
         );
      });
      return T.as_(dropping, () => from(array));
   });
}

export function dropWhileTask<A, R, E>(p: (a: A) => T.Task<R, E, boolean>): (l: List<A>) => T.Task<R, E, List<A>> {
   return (l) => dropWhileTask_(l, p);
}
