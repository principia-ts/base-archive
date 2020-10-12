import * as A from "@principia/core/Array";
import type { Either } from "@principia/core/Either";
import * as E from "@principia/core/Either";
import { constVoid, flow, pipe, tuple } from "@principia/core/Function";
import type { NonEmptyArray } from "@principia/core/NonEmptyArray";
import type { Option } from "@principia/core/Option";
import * as O from "@principia/core/Option";

import * as C from "../Cause";
import type { HasClock } from "../Clock";
import type { Effect } from "../Effect";
import * as T from "../Effect";
import { sequential } from "../ExecutionStrategy";
import type { Exit } from "../Exit";
import * as Ex from "../Exit";
import * as M from "../Managed";
import * as Sc from "../Schedule";
import type { Ref } from "../XRef";
import * as XR from "../XRef";
import { fail, fromEffect, repeatEffectOption } from "./constructors";
import { run, runManaged } from "./destructors";
import * as Pull from "./internal/Pull";
import * as Sink from "./internal/Sink";
import { chain, flatten, pure } from "./methods";
import type { UIO } from "./Stream";
import { Stream } from "./Stream";

export const absolve: <R, E, A, E1>(stream: Stream<R, E, Either<E1, A>>) => Stream<R, E | E1, A> = chain(
   E.fold(fail, pure)
);

export const unwrap = <R, E, A>(fa: T.Effect<R, E, Stream<R, E, A>>): Stream<R, E, A> => flatten(fromEffect(fa));

/**
 * Creates a stream from a `Schedule` that does not require any further
 * input. The stream will emit an element for each value output from the
 * schedule, continuing for as long as the schedule continues.
 */
export const fromSchedule: <R, A>(schedule: Sc.Schedule<R, unknown, A>) => Stream<R & HasClock, never, A> = flow(
   Sc.driver,
   T.map((driver) => repeatEffectOption(driver.next(constVoid()))),
   unwrap
);

/**
 * Creates a stream by effectfully peeling off the "layers" of a value of type `S`
 */
export const unfoldChunkM = <Z>(z: Z) => <R, E, A>(
   f: (z: Z) => T.Effect<R, E, Option<readonly [ReadonlyArray<A>, Z]>>
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
                             O.fold(
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
export const combineChunks = <R1, E1, B>(that: Stream<R1, E1, B>) => <Z>(z: Z) => <R, E, A, C>(
   f: (
      z: Z,
      s: T.Effect<R, Option<E>, ReadonlyArray<A>>,
      t: T.Effect<R1, Option<E1>, ReadonlyArray<B>>
   ) => T.Effect<R & R1, never, Exit<Option<E | E1>, readonly [ReadonlyArray<C>, Z]>>
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
      return [fc, E.left(A.dropLeft_(fa, fb.length))];
   }

   return [fc, E.right(A.dropLeft_(fb, fa.length))];
}

/**
 * Zips this stream with another point-wise and applies the function to the paired elements.
 *
 * The new stream will end when one of the sides ends.
 *
 * By default pull is executed in parallel to preserve async semantics, see `zipWithSeq` for
 * a sequential alternative
 */
export function mapBothPar_<R, E, O, O2, O3, R1, E1>(
   stream: Stream<R, E, O>,
   that: Stream<R1, E1, O2>,
   f: (a: O, a1: O2) => O3,
   ps: "seq"
): Stream<R & R1, E1 | E, O3>;
export function mapBothPar_<R, E, O, O2, O3, R1, E1>(
   stream: Stream<R, E, O>,
   that: Stream<R1, E1, O2>,
   f: (a: O, a1: O2) => O3,
   ps?: "par" | "seq"
): Stream<R & R1, E1 | E, O3>;
export function mapBothPar_<R, E, O, O2, O3, R1, E1>(
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
      leftUpd: Option<ReadonlyArray<O>>,
      rightUpd: Option<ReadonlyArray<O2>>,
      excess: Either<ReadonlyArray<O>, ReadonlyArray<O2>>
   ): Exit<Option<never>, readonly [ReadonlyArray<O3>, State<O, O2>]> => {
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
            O.fold(
               () => leftExcess,
               (upd) => [...leftExcess, ...upd] as ReadonlyArray<O>
            )
         ),
         pipe(
            rightUpd,
            O.fold(
               () => rightExcess,
               (upd) => [...rightExcess, ...upd] as ReadonlyArray<O2>
            )
         )
      ];

      const [emit, newExcess] = __zipChunks(left, right, f);

      if (O.isSome(leftUpd) && O.isSome(rightUpd)) {
         return Ex.succeed(
            tuple<[ReadonlyArray<O3>, State<O, O2>]>(emit, {
               _tag: "Running",
               excess: newExcess
            })
         );
      } else if (O.isNone(leftUpd) && O.isNone(rightUpd)) {
         return Ex.fail(O.none());
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
               return T.pure(Ex.fail(O.none()));
            }
            case "Running": {
               return pipe(
                  p1,
                  T.optional,
                  ps === "par"
                     ? T.mapBothPar(T.optional(p2), (l, r) => handleSuccess(l, r, st.excess))
                     : T.mapBoth(T.optional(p2), (l, r) => handleSuccess(l, r, st.excess)),
                  T.catchAllCause((e) => T.pure(Ex.failure(pipe(e, C.map(O.some)))))
               );
            }
            case "LeftDone": {
               return pipe(
                  p2,
                  T.optional,
                  T.map((r) => handleSuccess(O.none(), r, E.left(st.excessL))),
                  T.catchAllCause((e) => T.pure(Ex.failure(pipe(e, C.map(O.some)))))
               );
            }
            case "RightDone": {
               return pipe(
                  p1,
                  T.optional,
                  T.map((l) => handleSuccess(l, O.none(), E.right(st.excessR))),
                  T.catchAllCause((e) => T.pure(Ex.failure(pipe(e, C.map(O.some)))))
               );
            }
         }
      })
   );
}

export function mapBothPar<O, O2, O3, R1, E1>(
   that: Stream<R1, E1, O2>,
   f: (a: O, a1: O2) => O3,
   ps: "seq"
): <R, E>(stream: Stream<R, E, O>) => Stream<R & R1, E1 | E, O3>;
export function mapBothPar<O, O2, O3, R1, E1>(
   that: Stream<R1, E1, O2>,
   f: (a: O, a1: O2) => O3,
   ps?: "par" | "seq"
): <R, E>(stream: Stream<R, E, O>) => Stream<R & R1, E1 | E, O3>;
export function mapBothPar<O, O2, O3, R1, E1>(
   that: Stream<R1, E1, O2>,
   f: (a: O, a1: O2) => O3,
   ps: "par" | "seq" = "par"
): <R, E>(stream: Stream<R, E, O>) => Stream<R & R1, E1 | E, O3> {
   return (stream) => mapBothPar_(stream, that, f, ps);
}

export const mapBoth_ = <R, E, A, R1, E1, A1, B>(
   stream: Stream<R, E, A>,
   that: Stream<R1, E1, A1>,
   f: (a: A, a1: A1) => B
) => mapBothPar_(stream, that, f, "seq");

export const bothMap = <A, R1, E1, A1, B>(that: Stream<R1, E1, A1>, f: (a: A, a1: A1) => B) => <R, E>(
   stream: Stream<R, E, A>
) => mapBoth_(stream, that, f);

/**
 * Switches over to the stream produced by the provided function in case this one
 * fails. Allows recovery from all causes of failure, including interruption if the
 * stream is uninterruptible.
 */
export const catchAllCause_ = <R, E, A, R1, E2, B>(
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
         M.bindS("finalizerRef", () => M.finalizerRef(M.noopFinalizer) as M.Managed<R, never, XR.Ref<M.Finalizer>>),
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

            const open = <R, E0, O>(stream: Stream<R, E0, O>) => (asState: (_: Pull.Pull<R, E0, O>) => State<E>) =>
               T.uninterruptibleMask(({ restore }) =>
                  pipe(
                     M.makeReleaseMap,
                     T.chain((releaseMap) =>
                        pipe(
                           finalizerRef.set((exit) => M.releaseAll(exit, sequential())(releaseMap)),
                           T.chain(() =>
                              pipe(
                                 restore(stream.proc.effect),
                                 T.local((_: R) => [_, releaseMap] as [R, M.ReleaseMap]),
                                 T.map(([_, __]) => __),
                                 T.chainFirst((pull) => ref.set(asState(pull)))
                              )
                           )
                        )
                     )
                  )
               );

            const failover = (cause: C.Cause<Option<E>>) =>
               pipe(
                  cause,
                  C.sequenceCauseOption,
                  O.fold(
                     () => T.fail(O.none()),
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

export const catchAllCause = <E, R1, E1, B>(f: (e: C.Cause<E>) => Stream<R1, E1, B>) => <R, A>(
   stream: Stream<R, E, A>
): Stream<R & R1, E1, B | A> => catchAllCause_(stream, f);

function go<R, E, A>(
   streams: ReadonlyArray<Stream<R, E, A>>,
   chunkSize: number,
   currIndex: Ref<number>,
   currStream: Ref<T.Effect<R, Option<E>, ReadonlyArray<A>>>,
   switchStream: (
      x: M.Managed<R, never, T.Effect<R, Option<E>, ReadonlyArray<A>>>
   ) => T.Effect<R, never, T.Effect<R, Option<E>, ReadonlyArray<A>>>
): T.Effect<R, Option<E>, ReadonlyArray<A>> {
   return pipe(
      currStream.get,
      T.flatten,
      T.catchAllCause((x) =>
         O.fold_(
            C.sequenceCauseOption(x),
            () =>
               pipe(
                  currIndex,
                  XR.getAndUpdate((x) => x + 1),
                  T.chain((i) =>
                     i >= chunkSize
                        ? Pull.end
                        : pipe(
                             switchStream(streams[i].proc),
                             T.chain(currStream.set),
                             T.apSecond(go(streams, chunkSize, currIndex, currStream, switchStream))
                          )
                  )
               ),
            Pull.halt
         )
      )
   );
}

/**
 * Concatenates all of the streams in the chunk to one stream.
 */
export const concatAll = <R, E, A>(streams: Array<Stream<R, E, A>>): Stream<R, E, A> => {
   const chunkSize = streams.length;
   return new Stream(
      pipe(
         M.of,
         M.bindS("currIndex", () => XR.makeManagedRef(0)),
         M.bindS("currStream", () => XR.makeManagedRef<T.Effect<R, Option<E>, ReadonlyArray<A>>>(Pull.end)),
         M.bindS("switchStream", () => M.switchable<R, never, T.Effect<R, Option<E>, ReadonlyArray<A>>>()),
         M.map(({ currIndex, currStream, switchStream }) => go(streams, chunkSize, currIndex, currStream, switchStream))
      )
   );
};

/**
 * Executes the provided finalizer before this stream's finalizers run.
 */
export const ensuringFirst_ = <R, E, A, R1>(self: Stream<R, E, A>, fin: Effect<R1, never, unknown>) =>
   new Stream<R & R1, E, A>(M.ensuringFirst_(self.proc, fin));

/**
 * Executes the provided finalizer before this stream's finalizers run.
 */
export const ensuringFirst = <R1>(fin: Effect<R1, never, unknown>) => <R, E, A>(self: Stream<R, E, A>) =>
   ensuringFirst_(self, fin);
