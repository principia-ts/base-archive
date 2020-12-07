import type { Chunk } from "../../Chunk";
import * as C from "../../Chunk";
import type { Either } from "../../Either";
import * as E from "../../Either";
import { pipe } from "../../Function";
import * as I from "../../IO";
import * as Ca from "../../IO/Cause";
import * as Ex from "../../IO/Exit";
import * as F from "../../IO/Fiber";
import * as XR from "../../IORef";
import * as M from "../../Managed/_core";
import type { Option } from "../../Option";
import * as O from "../../Option";
import * as Push from "../Push";
import { fromFoldLeftChunks } from "./constructors";
import { map_ } from "./functor";
import { Sink } from "./model";

/**
 * Replaces this sink's result with the provided value.
 */
export function as_<R, E, I, L, Z, Z1>(sz: Sink<R, E, I, L, Z>, z1: Z1): Sink<R, E, I, L, Z1> {
  return map_(sz, () => z1);
}

/**
 * Replaces this sink's result with the provided value.
 */
export function as<Z1>(z1: Z1): <R, E, I, L, Z>(sz: Sink<R, E, I, L, Z>) => Sink<R, E, I, L, Z1> {
  return (sz) => as_(sz, z1);
}

/**
 * A sink that collects all of its inputs into an array.
 */
export function collectAll<A>(): Sink<unknown, never, A, A, Chunk<A>> {
  return fromFoldLeftChunks(C.empty<A>(), (s, i: Chunk<A>) => C.concat_(s, i));
}

/**
 * Repeatedly runs the sink for as long as its results satisfy
 * the predicate `p`. The sink's results will be accumulated
 * using the stepping function `f`.
 */
export function collectAllWhileWith_<R, E, I, L, Z, S>(
  sz: Sink<R, E, I, L, Z>,
  z: S,
  p: (z: Z) => boolean,
  f: (s: S, z: Z) => S
): Sink<R, E, I, L, S> {
  return new Sink(
    pipe(
      XR.makeManaged(z),
      M.chain((acc) => {
        return pipe(
          Push.restartable(sz.push),
          M.map(([push, restart]) => {
            const go = (
              s: S,
              in_: O.Option<Chunk<I>>,
              end: boolean
            ): I.IO<R, [E.Either<E, S>, Chunk<L>], S> =>
              I.catchAll_(
                I.as_(push(in_), () => s),
                ([e, leftover]) =>
                  E.fold_(
                    e,
                    (e) => Push.fail(e, leftover),
                    (z) => {
                      if (p(z)) {
                        const s1 = f(s, z);

                        if (leftover.length === 0) {
                          if (end) {
                            return Push.emit(s1, C.empty());
                          } else {
                            return I.as_(restart, () => s1);
                          }
                        } else {
                          return I.apSecond_(
                            restart,
                            go(s1, O.some((leftover as unknown) as Chunk<I>), end)
                          );
                        }
                      } else {
                        return Push.emit(s, leftover);
                      }
                    }
                  )
              );

            return (in_: O.Option<Chunk<I>>) =>
              I.chain_(acc.get, (s) => I.chain_(go(s, in_, O.isNone(in_)), (s1) => acc.set(s1)));
          })
        );
      })
    )
  );
}

/**
 * Repeatedly runs the sink for as long as its results satisfy
 * the predicate `p`. The sink's results will be accumulated
 * using the stepping function `f`.
 */
export function collectAllWhileWith<R, E, I, L, Z, S>(
  z: S,
  p: (z: Z) => boolean,
  f: (s: S, z: Z) => S
): (sz: Sink<R, E, I, L, Z>) => Sink<R, E, I, L, S> {
  return (sz) => collectAllWhileWith_(sz, z, p, f);
}

/**
 * Runs both sinks in parallel on the input, returning the result or the error from the
 * one that finishes first.
 */
export function raceBoth<R1, E1, I1 extends I, L1, Z1, I>(that: Sink<R1, E1, I1, L1, Z1>) {
  return <R, E, L, Z>(
    self: Sink<R, E, I, L, Z>
  ): Sink<R1 & R, E1 | E, I1, L1 | L, E.Either<Z, Z1>> =>
    new Sink(
      pipe(
        M.do,
        M.bindS("p1", () => self.push),
        M.bindS("p2", () => that.push),
        M.map(({ p1, p2 }) => (i: Option<Chunk<I1>>): I.IO<
          R1 & R,
          readonly [Either<E | E1, Either<Z, Z1>>, Chunk<L | L1>],
          void
        > =>
          I.raceWith_(
            p1(i),
            p2(i),
            (res1, fib2) =>
              Ex.foldM_(
                res1,
                (f) =>
                  I.apSecond_(
                    F.interrupt(fib2),
                    I.halt(
                      pipe(
                        f,
                        Ca.map(([r, leftover]) => [E.map_(r, E.left), leftover] as const)
                      )
                    )
                  ),
                () =>
                  I.mapError_(
                    F.join(fib2),
                    ([r, leftover]) => [E.map_(r, E.right), leftover] as const
                  )
              ),
            (res2, fib1) =>
              Ex.foldM_(
                res2,
                (f) =>
                  I.apSecond_(
                    F.interrupt(fib1),
                    I.halt(
                      pipe(
                        f,
                        Ca.map(([r, leftover]) => [E.map_(r, E.right), leftover] as const)
                      )
                    )
                  ),
                () =>
                  I.mapError_(
                    F.join(fib1),
                    ([r, leftover]) => [E.map_(r, E.left), leftover] as const
                  )
              )
          )
        )
      )
    );
}

export function dropLeftover<R, E, I, L, Z>(sz: Sink<R, E, I, L, Z>): Sink<R, E, I, never, Z> {
  return new Sink(
    M.map_(sz.push, (p) => (in_: O.Option<Chunk<I>>) =>
      I.mapError_(p(in_), ([v, _]) => [v, C.empty()])
    )
  );
}
