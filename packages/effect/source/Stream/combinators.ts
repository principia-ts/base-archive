import * as A from "@principia/core/Array";
import * as E from "@principia/core/Either";
import { Either } from "@principia/core/Either";
import { constVoid, flow, pipe, tuple } from "@principia/core/Function";
import { Maybe } from "@principia/core/Maybe";
import * as Mb from "@principia/core/Maybe";
import { NonEmptyArray } from "@principia/core/NonEmptyArray";

import * as C from "../Cause";
import { HasClock } from "../Clock";
import * as T from "../Effect";
import { sequential } from "../ExecutionStrategy";
import * as Ex from "../Exit";
import { Exit } from "../Exit";
import * as M from "../Managed";
import * as Sc from "../Schedule";
import * as XR from "../XRef";
import { fail, fromEffect, repeatEffectOption } from "./constructors";
import * as Pull from "./internal/Pull";
import { chain, flatten, pure } from "./methods";
import { Stream } from "./Stream";

export const absolve: <R, E, A, E1>(
   stream: Stream<R, E, Either<E1, A>>
) => Stream<R, E | E1, A> = chain(E.fold(fail, pure));

export const unwrap = <R, E, A>(fa: T.Effect<R, E, Stream<R, E, A>>): Stream<R, E, A> =>
   flatten(fromEffect(fa));

/**
 * Creates a stream from a `Schedule` that does not require any further
 * input. The stream will emit an element for each value output from the
 * schedule, continuing for as long as the schedule continues.
 */
export const fromSchedule: <R, A>(
   schedule: Sc.Schedule<R, unknown, A>
) => Stream<R & HasClock, never, A> = flow(
   Sc.driver,
   T.map((driver) => repeatEffectOption(driver.next(constVoid()))),
   unwrap
);

/**
 * Creates a stream by effectfully peeling off the "layers" of a value of type `S`
 */
export const unfoldChunkM = <Z>(z: Z) => <R, E, A>(
   f: (z: Z) => T.Effect<R, E, Maybe<readonly [ReadonlyArray<A>, Z]>>
): Stream<R, E, A> =>
   new Stream(
      pipe(
         M.of,
         M.bindS("done", () => XR.makeManagedRef(false)),
         M.bindS("ref", () => XR.makeManagedRef(z)),
         M.letS("pull", ({ done, ref }) =>
            pipe(
               done.get,
               T.chain((isDone) =>
                  isDone
                     ? Pull.end
                     : pipe(
                          ref.get,
                          T.chain(f),
                          T.foldM(
                             Pull.fail,
                             Mb.fold(
                                () =>
                                   pipe(
                                      done.set(true),
                                      T.chain(() => Pull.end)
                                   ),
                                ([a, z]) =>
                                   pipe(
                                      ref.set(z),
                                      T.map(() => a)
                                   )
                             )
                          )
                       )
               )
            )
         ),
         M.map(({ pull }) => pull)
      )
   );

/**
 * Combines the chunks from this stream and the specified stream by repeatedly applying the
 * function `f` to extract a chunk using both sides and conceptually "offer"
 * it to the destination stream. `f` can maintain some internal state to control
 * the combining process, with the initial state being specified by `s`.
 */
export const combineChunks = <R1, E1, B>(that: Stream<R1, E1, B>) => <Z>(z: Z) => <
   X,
   R,
   E,
   A,
   X2,
   C
>(
   f: (
      z: Z,
      s: T.Effect<R, Maybe<E>, ReadonlyArray<A>>,
      t: T.Effect<R1, Maybe<E1>, ReadonlyArray<B>>
   ) => T.Effect<R & R1, never, Exit<Maybe<E | E1>, readonly [ReadonlyArray<C>, Z]>>
) => (self: Stream<R, E, A>): Stream<R & R1, E1 | E, C> =>
   new Stream(
      pipe(
         M.of,
         M.bindS("left", () => self.proc),
         M.bindS("right", () => that.proc),
         M.bindS(
            "pull",
            ({ left, right }) =>
               unfoldChunkM(z)((z) =>
                  pipe(
                     f(z, left, right),
                     T.chain((ex) => T.optional(T.done(ex)))
                  )
               ).proc
         ),
         M.map(({ pull }) => pull)
      )
   );

function __zipChunks<A, B, C>(
   fa: ReadonlyArray<A>,
   fb: ReadonlyArray<B>,
   f: (a: A, b: B) => C
): [ReadonlyArray<C>, E.Either<ReadonlyArray<A>, ReadonlyArray<B>>] {
   const fc: C[] = [];
   const len = Math.min(fa.length, fb.length);
   for (let i = 0; i < len; i++) {
      fc[i] = f(fa[i], fb[i]);
   }

   if (fa.length > fb.length) {
      return [fc, E.left(A._dropLeft(fa, fb.length))];
   }

   return [fc, E.right(A._dropLeft(fb, fa.length))];
}

/**
 * Zips this stream with another point-wise and applies the function to the paired elements.
 *
 * The new stream will end when one of the sides ends.
 *
 * By default pull is executed in parallel to preserve async semantics, see `zipWithSeq` for
 * a sequential alternative
 */
export function _bothMapPar<R, E, O, O2, O3, R1, E1>(
   stream: Stream<R, E, O>,
   that: Stream<R1, E1, O2>,
   f: (a: O, a1: O2) => O3,
   ps: "seq"
): Stream<R & R1, E1 | E, O3>;
export function _bothMapPar<R, E, O, O2, O3, R1, E1>(
   stream: Stream<R, E, O>,
   that: Stream<R1, E1, O2>,
   f: (a: O, a1: O2) => O3,
   ps?: "par" | "seq"
): Stream<R & R1, E1 | E, O3>;
export function _bothMapPar<R, E, O, O2, O3, R1, E1>(
   stream: Stream<R, E, O>,
   that: Stream<R1, E1, O2>,
   f: (a: O, a1: O2) => O3,
   ps: "par" | "seq" = "par"
): Stream<R & R1, E1 | E, O3> {
   type End = { _tag: "End" };
   type RightDone<W2> = { _tag: "RightDone"; excessR: NonEmptyArray<W2> };
   type LeftDone<W1> = { _tag: "LeftDone"; excessL: NonEmptyArray<W1> };
   type Running<W1, W2> = {
      _tag: "Running";
      excess: Either<ReadonlyArray<W1>, ReadonlyArray<W2>>;
   };
   type State<W1, W2> = End | Running<W1, W2> | LeftDone<W1> | RightDone<W2>;

   const handleSuccess = (
      leftUpd: Maybe<ReadonlyArray<O>>,
      rightUpd: Maybe<ReadonlyArray<O2>>,
      excess: Either<ReadonlyArray<O>, ReadonlyArray<O2>>
   ): Exit<Maybe<never>, readonly [ReadonlyArray<O3>, State<O, O2>]> => {
      const [leftExcess, rightExcess] = pipe(
         excess,
         E.fold(
            (l) => tuple<[ReadonlyArray<O>, ReadonlyArray<O2>]>(l, []),
            (r) => tuple<[ReadonlyArray<O>, ReadonlyArray<O2>]>([], r)
         )
      );

      const [left, right] = [
         pipe(
            leftUpd,
            Mb.fold(
               () => leftExcess,
               (upd) => [...leftExcess, ...upd] as ReadonlyArray<O>
            )
         ),
         pipe(
            rightUpd,
            Mb.fold(
               () => rightExcess,
               (upd) => [...rightExcess, ...upd] as ReadonlyArray<O2>
            )
         )
      ];

      const [emit, newExcess] = __zipChunks(left, right, f);

      if (Mb.isJust(leftUpd) && Mb.isJust(rightUpd)) {
         return Ex.succeed(
            tuple<[ReadonlyArray<O3>, State<O, O2>]>(emit, {
               _tag: "Running",
               excess: newExcess
            })
         );
      } else if (Mb.isNothing(leftUpd) && Mb.isNothing(rightUpd)) {
         return Ex.fail(Mb.nothing());
      } else {
         return Ex.succeed(
            tuple(
               emit,
               pipe(
                  newExcess,
                  E.fold(
                     (l): State<O, O2> =>
                        A.isNonEmpty(l)
                           ? {
                                _tag: "LeftDone",
                                excessL: l
                             }
                           : { _tag: "End" },
                     (r): State<O, O2> =>
                        A.isNonEmpty(r)
                           ? {
                                _tag: "RightDone",
                                excessR: r
                             }
                           : { _tag: "End" }
                  )
               )
            )
         );
      }
   };

   return pipe(
      stream,
      combineChunks(that)<State<O, O2>>({
         _tag: "Running",
         excess: E.left([])
      })((st, p1, p2) => {
         switch (st._tag) {
            case "End": {
               return T.pure(Ex.fail(Mb.nothing()));
            }
            case "Running": {
               return pipe(
                  p1,
                  T.optional,
                  ps === "par"
                     ? T.mapBothPar(T.optional(p2), (l, r) => handleSuccess(l, r, st.excess))
                     : T.mapBoth(T.optional(p2), (l, r) => handleSuccess(l, r, st.excess)),
                  T.catchAllCause((e) => T.pure(Ex.failure(pipe(e, C.map(Mb.just)))))
               );
            }
            case "LeftDone": {
               return pipe(
                  p2,
                  T.optional,
                  T.map((r) => handleSuccess(Mb.nothing(), r, E.left(st.excessL))),
                  T.catchAllCause((e) => T.pure(Ex.failure(pipe(e, C.map(Mb.just)))))
               );
            }
            case "RightDone": {
               return pipe(
                  p1,
                  T.optional,
                  T.map((l) => handleSuccess(l, Mb.nothing(), E.right(st.excessR))),
                  T.catchAllCause((e) => T.pure(Ex.failure(pipe(e, C.map(Mb.just)))))
               );
            }
         }
      })
   );
}

export function bothMapPar<O, O2, O3, R1, E1>(
   that: Stream<R1, E1, O2>,
   f: (a: O, a1: O2) => O3,
   ps: "seq"
): <R, E>(stream: Stream<R, E, O>) => Stream<R & R1, E1 | E, O3>;
export function bothMapPar<O, O2, O3, R1, E1>(
   that: Stream<R1, E1, O2>,
   f: (a: O, a1: O2) => O3,
   ps?: "par" | "seq"
): <R, E>(stream: Stream<R, E, O>) => Stream<R & R1, E1 | E, O3>;
export function bothMapPar<R, E, O, O2, O3, R1, E1>(
   that: Stream<R1, E1, O2>,
   f: (a: O, a1: O2) => O3,
   ps: "par" | "seq" = "par"
): <R, E>(stream: Stream<R, E, O>) => Stream<R & R1, E1 | E, O3> {
   return (stream) => _bothMapPar(stream, that, f, ps);
}

export const _bothMap = <R, E, A, R1, E1, A1, B>(
   stream: Stream<R, E, A>,
   that: Stream<R1, E1, A1>,
   f: (a: A, a1: A1) => B
) => _bothMapPar(stream, that, f, "seq");

export const bothMap = <A, R1, E1, A1, B>(that: Stream<R1, E1, A1>, f: (a: A, a1: A1) => B) => <
   R,
   E
>(
   stream: Stream<R, E, A>
) => _bothMap(stream, that, f);

/**
 * Switches over to the stream produced by the provided function in case this one
 * fails. Allows recovery from all causes of failure, including interruption if the
 * stream is uninterruptible.
 */
export const _catchAllCause = <R, E, A, R1, E2, B>(
   stream: Stream<R, E, A>,
   f: (e: C.Cause<E>) => Stream<R1, E2, B>
): Stream<R & R1, E2, B | A> => {
   type NotStarted = { _tag: "NotStarted" };
   type Self<E0> = { _tag: "Self"; pull: Pull.Pull<R, E0, A> };
   type Other = { _tag: "Other"; pull: Pull.Pull<R1, E2, B> };
   type State<E0> = NotStarted | Self<E0> | Other;

   return new Stream<R & R1, E2, A | B>(
      pipe(
         M.of,
         M.bindS(
            "finalizerRef",
            () => M.finalizerRef(M.noopFinalizer) as M.Managed<R, never, XR.Ref<M.Finalizer>>
         ),
         M.bindS("ref", () =>
            pipe(
               XR.makeRef<State<E>>({ _tag: "NotStarted" }),
               T.toManaged()
            )
         ),
         M.letS("pull", ({ finalizerRef, ref }) => {
            const closeCurrent = (cause: C.Cause<any>) =>
               pipe(
                  finalizerRef,
                  XR.getAndSet(M.noopFinalizer),
                  T.chain((f) => f(Ex.failure(cause))),
                  T.makeUninterruptible
               );

            const open = <R, E0, O>(stream: Stream<R, E0, O>) => (
               asState: (_: Pull.Pull<R, E0, O>) => State<E>
            ) =>
               T.uninterruptibleMask(({ restore }) =>
                  pipe(
                     M.makeReleaseMap,
                     T.chain((releaseMap) =>
                        pipe(
                           finalizerRef.set((exit) => M.releaseAll(exit, sequential())(releaseMap)),
                           T.chain(() =>
                              pipe(
                                 restore(stream.proc.effect),
                                 T.provideSome((_: R) => [_, releaseMap] as [R, M.ReleaseMap]),
                                 T.map(([_, __]) => __),
                                 T.chainFirst((pull) => ref.set(asState(pull)))
                              )
                           )
                        )
                     )
                  )
               );

            const failover = (cause: C.Cause<Maybe<E>>) =>
               pipe(
                  cause,
                  C.sequenceCauseMaybe,
                  Mb.fold(
                     () => T.fail(Mb.nothing()),
                     (cause) =>
                        pipe(
                           closeCurrent(cause),
                           T.chain(() =>
                              open(f(cause))((pull) => ({
                                 _tag: "Other",
                                 pull
                              }))
                           ),
                           T.flatten
                        )
                  )
               );

            return pipe(
               ref.get,
               T.chain((s) => {
                  switch (s._tag) {
                     case "NotStarted": {
                        return pipe(
                           open(stream)((pull) => ({ _tag: "Self", pull })),
                           T.flatten,
                           T.catchAllCause(failover)
                        );
                     }
                     case "Self": {
                        return pipe(s.pull, T.catchAllCause(failover));
                     }
                     case "Other": {
                        return s.pull;
                     }
                  }
               })
            );
         }),
         M.map(({ pull }) => pull)
      )
   );
};

export const catchAllCause = <E, R1, E1, B>(f: (e: C.Cause<E>) => Stream<R1, E1, B>) => <X, R, A>(
   stream: Stream<R, E, A>
): Stream<R & R1, E1, B | A> => _catchAllCause(stream, f);
