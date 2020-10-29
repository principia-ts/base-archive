import type { Eq } from "@principia/prelude/Eq";

import { pipe, tuple } from "../../../Function";
import * as XP from "../../XPromise";
import * as XRM from "../../XRefM";
import * as _ from "../_core";
import type { IO, Task } from "../model";
import { to } from "./to";

/**
 * Returns a memoized version of the specified effectual function.
 */
export const memoize = <R, E, A, B>(f: (a: A) => Task<R, E, B>): IO<(a: A) => Task<R, E, B>> =>
   pipe(
      XRM.makeRefM(new Map<A, XP.XPromise<E, B>>()),
      _.map((ref) => (a: A) =>
         pipe(
            _.do,
            _.bindS("promise", () =>
               pipe(
                  ref,
                  XRM.modify((m) => {
                     const memo = m.get(a);
                     return memo
                        ? _.pure(tuple(memo, m))
                        : pipe(
                             _.do,
                             _.bindS("promise", () => XP.make<E, B>()),
                             _.tap(({ promise }) => _.fork(to(promise)(f(a)))),
                             _.map(({ promise }) => tuple(promise, m.set(a, promise)))
                          );
                  })
               )
            ),
            _.bindS("b", ({ promise }) => XP.await(promise)),
            _.map(({ b }) => b)
         )
      )
   );

/**
 * Returns a memoized version of the specified effectual function.
 *
 * This variant uses the compare function to compare `A`
 */
export const memoizeEq = <A>(eq: Eq<A>) => <R, E, B>(f: (a: A) => Task<R, E, B>): IO<(a: A) => Task<R, E, B>> =>
   pipe(
      XRM.makeRefM(new Map<A, XP.XPromise<E, B>>()),
      _.map((ref) => (a: A) =>
         pipe(
            _.do,
            _.bindS("promise", () =>
               pipe(
                  ref,
                  XRM.modify((m) => {
                     for (const [k, v] of Array.from(m)) {
                        if (eq.equals_(k, a)) {
                           return _.pure(tuple(v, m));
                        }
                     }
                     return pipe(
                        _.do,
                        _.bindS("promise", () => XP.make<E, B>()),
                        _.tap(({ promise }) => _.fork(to(promise)(f(a)))),
                        _.map(({ promise }) => tuple(promise, m.set(a, promise)))
                     );
                  })
               )
            ),
            _.bindS("b", ({ promise }) => XP.await(promise)),
            _.map(({ b }) => b)
         )
      )
   );
