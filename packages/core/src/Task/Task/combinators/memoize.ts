import type { Eq } from "@principia/prelude/Eq";

import * as T from "../_core";
import { pipe, tuple } from "../../../Function";
import * as P from "../../XPromise";
import * as RM from "../../XRefM";
import type { IO, Task } from "../model";
import { to } from "./to";

/**
 * Returns a memoized version of the specified effectual function.
 */
export const memoize = <R, E, A, B>(f: (a: A) => Task<R, E, B>): IO<(a: A) => Task<R, E, B>> =>
  pipe(
    RM.make(new Map<A, P.XPromise<E, B>>()),
    T.map((ref) => (a: A) =>
      pipe(
        T.do,
        T.bindS("promise", () =>
          pipe(
            ref,
            RM.modify((m) => {
              const memo = m.get(a);
              return memo
                ? T.pure(tuple(memo, m))
                : pipe(
                    T.do,
                    T.bindS("promise", () => P.make<E, B>()),
                    T.tap(({ promise }) => T.fork(to(promise)(f(a)))),
                    T.map(({ promise }) => tuple(promise, m.set(a, promise)))
                  );
            })
          )
        ),
        T.bindS("b", ({ promise }) => P.await(promise)),
        T.map(({ b }) => b)
      )
    )
  );

/**
 * Returns a memoized version of the specified effectual function.
 *
 * This variant uses the compare function to compare `A`
 */
export const memoizeEq = <A>(eq: Eq<A>) => <R, E, B>(
  f: (a: A) => Task<R, E, B>
): IO<(a: A) => Task<R, E, B>> =>
  pipe(
    RM.make(new Map<A, P.XPromise<E, B>>()),
    T.map((ref) => (a: A) =>
      pipe(
        T.do,
        T.bindS("promise", () =>
          pipe(
            ref,
            RM.modify((m) => {
              for (const [k, v] of Array.from(m)) {
                if (eq.equals_(k, a)) {
                  return T.pure(tuple(v, m));
                }
              }
              return pipe(
                T.do,
                T.bindS("promise", () => P.make<E, B>()),
                T.tap(({ promise }) => T.fork(to(promise)(f(a)))),
                T.map(({ promise }) => tuple(promise, m.set(a, promise)))
              );
            })
          )
        ),
        T.bindS("b", ({ promise }) => P.await(promise)),
        T.map(({ b }) => b)
      )
    )
  );
