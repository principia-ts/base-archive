import type { Eq } from "@principia/prelude/Eq";

import { pipe, tuple } from "../../Function";
import * as RM from "../../IORefM";
import * as P from "../../Promise";
import * as I from "../_core";
import type { IO, UIO } from "../model";
import { to } from "./to";

/**
 * Returns a memoized version of the specified effectual function.
 */
export const memoize = <R, E, A, B>(f: (a: A) => IO<R, E, B>): UIO<(a: A) => IO<R, E, B>> =>
  pipe(
    RM.make(new Map<A, P.Promise<E, B>>()),
    I.map((ref) => (a: A) =>
      pipe(
        I.do,
        I.bindS("promise", () =>
          pipe(
            ref,
            RM.modify((m) => {
              const memo = m.get(a);
              return memo
                ? I.pure(tuple(memo, m))
                : pipe(
                    I.do,
                    I.bindS("promise", () => P.make<E, B>()),
                    I.tap(({ promise }) => I.fork(to(promise)(f(a)))),
                    I.map(({ promise }) => tuple(promise, m.set(a, promise)))
                  );
            })
          )
        ),
        I.bindS("b", ({ promise }) => P.await(promise)),
        I.map(({ b }) => b)
      )
    )
  );

/**
 * Returns a memoized version of the specified effectual function.
 *
 * This variant uses the compare function to compare `A`
 */
export const memoizeEq = <A>(eq: Eq<A>) => <R, E, B>(
  f: (a: A) => IO<R, E, B>
): UIO<(a: A) => IO<R, E, B>> =>
  pipe(
    RM.make(new Map<A, P.Promise<E, B>>()),
    I.map((ref) => (a: A) =>
      pipe(
        I.do,
        I.bindS("promise", () =>
          pipe(
            ref,
            RM.modify((m) => {
              for (const [k, v] of Array.from(m)) {
                if (eq.equals_(k, a)) {
                  return I.pure(tuple(v, m));
                }
              }
              return pipe(
                I.do,
                I.bindS("promise", () => P.make<E, B>()),
                I.tap(({ promise }) => I.fork(to(promise)(f(a)))),
                I.map(({ promise }) => tuple(promise, m.set(a, promise)))
              );
            })
          )
        ),
        I.bindS("b", ({ promise }) => P.await(promise)),
        I.map(({ b }) => b)
      )
    )
  );
