import { pipe } from "../Function";
import * as T from "../Task/Task";
import * as XR from "../Task/XRef";
import { push } from "./_internal";
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

export function dropWhileTask<A, R, E>(p: (a: A) => T.Task<R, E, boolean>): (l: List<A>) => T.Task<R, E, List<A>> {
   return (l) => dropWhileTask_(l, p);
}

export function filterTask_<A, R, E>(l: List<A>, p: (a: A) => T.Task<R, E, boolean>): T.Task<R, E, List<A>> {
   return T.suspend(() => {
      let r = T.succeed(empty<A>()) as T.Task<R, E, List<A>>;
      forEach_(l, (a) => {
         r = T.mapBoth_(r, p(a), (l, b) => (b ? append_(l, a) : l));
      });
      return r;
   });
}

export function filterTask<A, R, E>(p: (a: A) => T.Task<R, E, boolean>): (l: List<A>) => T.Task<R, E, List<A>> {
   return (l) => filterTask_(l, p);
}
