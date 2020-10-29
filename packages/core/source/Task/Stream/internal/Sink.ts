import * as A from "../../../Array";
import type { Either } from "../../../Either";
import * as E from "../../../Either";
import { pipe } from "../../../Function";
import type { Option } from "../../../Option";
import * as O from "../../../Option";
import * as Ex from "../../Exit";
import * as C from "../../Exit/Cause";
import * as F from "../../Fiber";
import * as M from "../../Managed/_core";
import * as T from "../../Task";
import * as XR from "../../XRef";
import * as Push from "./Push";

// Important notes while writing sinks and combinators:
// - What return values for sinks mean:
//   Task.unit - "need more values"
//   Task.fail([Either.Right(z), l]) - "ended with z and emit leftover l"
//   Task.fail([Either.Left(e), l]) - "failed with e and emit leftover l"
// - Result of processing of the stream using the sink must not depend on how the stream is chunked
//   (chunking-invariance)
//   pipe(stream, run(sink), Task.either) === pipe(stream, chunkN(1), run(sink), Task.either)
// - Sinks should always end when receiving a `None`. It is a defect to not end with some
//   sort of result (even a failure) when receiving a `None`.
// - Sinks can assume they will not be pushed again after emitting a value.
export class Sink<R, E, I, L, Z> {
   constructor(readonly push: M.Managed<R, never, Push.Push<R, E, I, L, Z>>) {}
}

/**
 * Creates a sink from a Push
 */
export const fromPush = <R, E, I, L, Z>(push: Push.Push<R, E, I, L, Z>) => new Sink(M.succeed(push));

/**
 * A sink that immediately ends with the specified value.
 */
export const succeed = <Z, I>(z: Z): Sink<unknown, never, I, I, Z> =>
   fromPush<unknown, never, I, I, Z>((c) => {
      const leftover = O.fold_(
         c,
         () => [] as ReadonlyArray<I>,
         (x) => x
      );

      return Push.emit(z, leftover);
   });

/**
 * A sink that effectfully folds its input chunks with the provided function, termination predicate and initial state.
 * `contFn` condition is checked only for the initial value and at the end of processing of each chunk.
 * `f` and `contFn` must preserve chunking-invariance.
 */
export const foldArraysM = <Z>(z: Z) => (contFn: (s: Z) => boolean) => <I, R, E>(
   f: (s: Z, i: ReadonlyArray<I>) => T.Task<R, E, Z>
): Sink<R, E, I, I, Z> => {
   if (contFn(z)) {
      return new Sink(
         pipe(
            M.do,
            M.bindS("state", () => pipe(XR.makeRef(z), T.toManaged())),
            M.letS("push", ({ state }) => (is: Option<ReadonlyArray<I>>) => {
               switch (is._tag) {
                  case "None": {
                     return pipe(
                        state.get,
                        T.chain((s) => Push.emit(s, []))
                     );
                  }
                  case "Some": {
                     return pipe(
                        state.get,
                        T.chain((s) =>
                           pipe(
                              f(s, is.value),
                              T.first((e) => [E.left(e), []] as [Either<E, never>, ReadonlyArray<I>]),
                              T.chain((s) =>
                                 contFn(s)
                                    ? pipe(
                                         state.set(s),
                                         T.chain(() => Push.more)
                                      )
                                    : Push.emit(s, [])
                              )
                           )
                        )
                     );
                  }
               }
            }),
            M.map(({ push }) => push)
         )
      );
   } else {
      return succeed<Z, I>(z);
   }
};

/**
 * A sink that folds its input chunks with the provided function, termination predicate and initial state.
 * `contFn` condition is checked only for the initial value and at the end of processing of each chunk.
 * `f` and `contFn` must preserve chunking-invariance.
 */
export const foldArrays = <Z>(z: Z) => (contFn: (s: Z) => boolean) => <I>(
   f: (s: Z, i: ReadonlyArray<I>) => Z
): Sink<unknown, never, I, I, Z> => foldArraysM(z)(contFn)((z, i: ReadonlyArray<I>) => T.pure(f(z, i)));

/**
 * A sink that folds its input chunks with the provided function and initial state.
 * `f` must preserve chunking-invariance.
 */
export const foldLeftArrays = <Z>(z: Z) => <I>(f: (s: Z, i: ReadonlyArray<I>) => Z) => foldArrays(z)(() => true)(f);

/**
 * A sink that collects all of its inputs into an array.
 */
export const collectAll = <A>(): Sink<unknown, never, A, A, ReadonlyArray<A>> =>
   foldLeftArrays([] as ReadonlyArray<A>)((s, i: ReadonlyArray<A>) => [...s, ...i]);

/**
 * Runs both sinks in parallel on the input, returning the result or the error from the
 * one that finishes first.
 */
export const raceBoth = <R1, E1, I1 extends I, L1, Z1, I>(that: Sink<R1, E1, I1, L1, Z1>) => <R, E, L, Z>(
   self: Sink<R, E, I, L, Z>
): Sink<R1 & R, E1 | E, I1, L1 | L, E.Either<Z, Z1>> =>
   new Sink(
      pipe(
         M.do,
         M.bindS("p1", () => self.push),
         M.bindS("p2", () => that.push),
         M.map(({ p1, p2 }) => (i: Option<ReadonlyArray<I1>>): T.Task<
            R1 & R,
            readonly [Either<E | E1, Either<Z, Z1>>, ReadonlyArray<L | L1>],
            void
         > =>
            T.raceWith(
               p1(i),
               p2(i),
               (res1, fib2) =>
                  Ex.foldTask_(
                     res1,
                     (f) =>
                        T._apSecond(
                           F.interrupt(fib2),
                           T.halt(
                              pipe(
                                 f,
                                 C.map(([r, leftover]) => [E.map_(r, E.left), leftover] as const)
                              )
                           )
                        ),
                     () => T.first_(F.join(fib2), ([r, leftover]) => [E.map_(r, E.right), leftover] as const)
                  ),
               (res2, fib1) =>
                  Ex.foldTask_(
                     res2,
                     (f) =>
                        T._apSecond(
                           F.interrupt(fib1),
                           T.halt(
                              pipe(
                                 f,
                                 C.map(([r, leftover]) => [E.map_(r, E.right), leftover] as const)
                              )
                           )
                        ),
                     () => T.first_(F.join(fib1), ([r, leftover]) => [E.map_(r, E.left), leftover] as const)
                  )
            )
         )
      )
   );

/**
 * A sink that executes the provided effectful function for every element fed to it.
 */
export const foreach = <I, R1, E1>(f: (i: I) => T.Task<R1, E1, any>) => {
   const go = (
      chunk: ReadonlyArray<I>,
      idx: number,
      len: number
   ): T.Task<R1, [E.Either<E1, never>, ReadonlyArray<I>], void> => {
      if (idx === len) {
         return Push.more;
      } else {
         return pipe(
            f(chunk[idx]),
            T.foldM(
               (e) => Push.fail(e, A.dropLeft_(chunk, idx + 1)),
               () => go(chunk, idx + 1, len)
            )
         );
      }
   };

   return fromPush(
      O.fold(
         () => Push.emit<never, void>(undefined, []),
         (is: ReadonlyArray<I>) => go(is, 0, is.length)
      )
   );
};
