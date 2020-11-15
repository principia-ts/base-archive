import * as A from "../../../Array";
import type { Either } from "../../../Either";
import * as E from "../../../Either";
import { pipe } from "../../../Function";
import * as L from "../../../List";
import type { Option } from "../../../Option";
import * as O from "../../../Option";
import * as Ex from "../../Exit";
import * as C from "../../Exit/Cause";
import * as F from "../../Fiber";
import * as M from "../../Managed/_core";
import * as T from "../../Task";
import * as XR from "../../XRef";
import * as Push from "../internal/Push";
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
export function collectAll<A>(): Sink<unknown, never, A, A, L.List<A>> {
   return fromFoldLeftChunks(L.empty<A>(), (s, i: L.List<A>) => L.concat_(s, i));
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
         XR.makeManagedRef(z),
         M.chain((acc) => {
            return pipe(
               Push.restartable(sz.push),
               M.map(([push, restart]) => {
                  const go = (
                     s: S,
                     in_: O.Option<L.List<I>>,
                     end: boolean
                  ): T.Task<R, [E.Either<E, S>, L.List<L>], S> =>
                     T.catchAll_(T.as_(push(in_), s), ([e, leftover]) =>
                        E.fold_(
                           e,
                           (e) => Push.fail(e, leftover),
                           (z) => {
                              if (p(z)) {
                                 const s1 = f(s, z);

                                 if (leftover.length === 0) {
                                    if (end) {
                                       return Push.emit(s1, L.empty());
                                    } else {
                                       return T.as_(restart, s1);
                                    }
                                 } else {
                                    return T.apSecond_(
                                       restart,
                                       go(s1, O.some((leftover as unknown) as L.List<I>), end)
                                    );
                                 }
                              } else {
                                 return Push.emit(s, leftover);
                              }
                           }
                        )
                     );

                  return (in_: O.Option<L.List<I>>) =>
                     T.chain_(acc.get, (s) => T.chain_(go(s, in_, O.isNone(in_)), (s1) => acc.set(s1)));
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
   return <R, E, L, Z>(self: Sink<R, E, I, L, Z>): Sink<R1 & R, E1 | E, I1, L1 | L, E.Either<Z, Z1>> =>
      new Sink(
         pipe(
            M.do,
            M.bindS("p1", () => self.push),
            M.bindS("p2", () => that.push),
            M.map(({ p1, p2 }) => (i: Option<L.List<I1>>): T.Task<
               R1 & R,
               readonly [Either<E | E1, Either<Z, Z1>>, L.List<L | L1>],
               void
            > =>
               T.raceWith_(
                  p1(i),
                  p2(i),
                  (res1, fib2) =>
                     Ex.foldM_(
                        res1,
                        (f) =>
                           T.apSecond_(
                              F.interrupt(fib2),
                              T.halt(
                                 pipe(
                                    f,
                                    C.map(([r, leftover]) => [E.map_(r, E.left), leftover] as const)
                                 )
                              )
                           ),
                        () => T.mapError_(F.join(fib2), ([r, leftover]) => [E.map_(r, E.right), leftover] as const)
                     ),
                  (res2, fib1) =>
                     Ex.foldM_(
                        res2,
                        (f) =>
                           T.apSecond_(
                              F.interrupt(fib1),
                              T.halt(
                                 pipe(
                                    f,
                                    C.map(([r, leftover]) => [E.map_(r, E.right), leftover] as const)
                                 )
                              )
                           ),
                        () => T.mapError_(F.join(fib1), ([r, leftover]) => [E.map_(r, E.left), leftover] as const)
                     )
               )
            )
         )
      );
}

export function dropLeftover<R, E, I, L, Z>(sz: Sink<R, E, I, L, Z>): Sink<R, E, I, never, Z> {
   return new Sink(
      M.map_(sz.push, (p) => (in_: O.Option<L.List<I>>) => T.mapError_(p(in_), ([v, _]) => [v, L.empty()]))
   );
}
