import type { Eq } from "@principia/prelude/Eq";

import { pipe, tuple } from "../../../Function";
import * as XP from "../../XPromise";
import * as XRM from "../../XRefM";
import { bindS, fork, map, of, pure, tap } from "../core";
import type { Task, UIO } from "../model";
import { to } from "./to";

/**
 * Returns a memoized version of the specified effectual function.
 */
export const memoize = <R, E, A, B>(f: (a: A) => Task<R, E, B>): UIO<(a: A) => Task<R, E, B>> =>
   pipe(
      XRM.makeRefM(new Map<A, XP.XPromise<E, B>>()),
      map((ref) => (a: A) =>
         pipe(
            of,
            bindS("promise", () =>
               pipe(
                  ref,
                  XRM.modify((m) => {
                     const memo = m.get(a);
                     return memo
                        ? pure(tuple(memo, m))
                        : pipe(
                             of,
                             bindS("promise", () => XP.make<E, B>()),
                             tap(({ promise }) => fork(to(promise)(f(a)))),
                             map(({ promise }) => tuple(promise, m.set(a, promise)))
                          );
                  })
               )
            ),
            bindS("b", ({ promise }) => XP.await(promise)),
            map(({ b }) => b)
         )
      )
   );

/**
 * Returns a memoized version of the specified effectual function.
 *
 * This variant uses the compare function to compare `A`
 */
export const memoizeEq = <A>(eq: Eq<A>) => <R, E, B>(f: (a: A) => Task<R, E, B>): UIO<(a: A) => Task<R, E, B>> =>
   pipe(
      XRM.makeRefM(new Map<A, XP.XPromise<E, B>>()),
      map((ref) => (a: A) =>
         pipe(
            of,
            bindS("promise", () =>
               pipe(
                  ref,
                  XRM.modify((m) => {
                     for (const [k, v] of Array.from(m)) {
                        if (eq.equals_(k, a)) {
                           return pure(tuple(v, m));
                        }
                     }
                     return pipe(
                        of,
                        bindS("promise", () => XP.make<E, B>()),
                        tap(({ promise }) => fork(to(promise)(f(a)))),
                        map(({ promise }) => tuple(promise, m.set(a, promise)))
                     );
                  })
               )
            ),
            bindS("b", ({ promise }) => XP.await(promise)),
            map(({ b }) => b)
         )
      )
   );
