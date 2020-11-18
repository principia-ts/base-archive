import * as L from "../../../Array";
import type { Either } from "../../../Either";
import * as E from "../../../Either";
import { identity, pipe } from "../../../Function";
import * as O from "../../../Option";
import * as Ex from "../../Exit";
import type { Cause } from "../../Exit/Cause";
import * as C from "../../Exit/Cause";
import * as F from "../../Fiber";
import * as M from "../../Managed";
import * as T from "../../Task";
import * as XRM from "../../XRefM";
import * as H from "../internal/Handoff";
import type * as Pull from "../internal/Pull";
import * as Take from "../internal/Take";
import { Stream } from "../model";

export type TerminationStrategy = "Left" | "Right" | "Both" | "Either";

/**
 * Merges this stream and the specified stream together to a common element
 * type with the specified mapping functions.
 *
 * New produced stream will terminate when both specified stream terminate if
 * no termination strategy is specified.
 */
export function mergeWith_<R, E, A, R1, E1, B, C, C1>(
  sa: Stream<R, E, A>,
  sb: Stream<R1, E1, B>,
  l: (a: A) => C,
  r: (b: B) => C1,
  strategy: TerminationStrategy = "Both"
): Stream<R1 & R, E | E1, C | C1> {
  return new Stream(
    pipe(
      M.do,
      M.bindS("handoff", () => M.fromTask(H.make<Take.Take<E | E1, C | C1>>())),
      M.bindS("done", () => M.fromTask(XRM.makeRefM<O.Option<boolean>>(O.none()))),
      M.bindS("chunksL", () => sa.proc),
      M.bindS("chunksR", () => sb.proc),
      M.letS(
        "handler",
        ({ done, handoff }) => (pull: Pull.Pull<R & R1, E | E1, C | C1>, terminate: boolean) =>
          pipe(
            done.get,
            T.chain((o) => {
              if (o._tag === "Some" && o.value) {
                return T.succeed(false);
              } else {
                return pipe(
                  pull,
                  T.result,
                  T.chain((exit) =>
                    pipe(
                      done,
                      XRM.modify((o) => {
                        const causeOrChunk = pipe(
                          exit,
                          Ex.fold(
                            (c): Either<O.Option<Cause<E | E1>>, ReadonlyArray<C | C1>> =>
                              E.left(C.sequenceCauseOption(c)),
                            E.right
                          )
                        );

                        if (o._tag === "Some" && o.value) {
                          return T.succeed([false, o]);
                        } else if (causeOrChunk._tag === "Right") {
                          return pipe(
                            handoff,
                            H.offer(<Take.Take<E | E1, C | C1>>Take.chunk(causeOrChunk.right)),
                            T.as(() => [true, o])
                          );
                        } else if (
                          causeOrChunk._tag === "Left" &&
                          causeOrChunk.left._tag === "Some"
                        ) {
                          return pipe(
                            handoff,
                            H.offer(<Take.Take<E | E1, C | C1>>Take.halt(causeOrChunk.left.value)),
                            T.as(() => [false, O.some(true)])
                          );
                        } else if (
                          causeOrChunk._tag === "Left" &&
                          causeOrChunk.left._tag === "None" &&
                          (terminate || o._tag === "Some")
                        ) {
                          return pipe(
                            handoff,
                            H.offer(<Take.Take<E | E1, C | C1>>Take.end),
                            T.as(() => [false, O.some(true)])
                          );
                        } else {
                          return T.succeed([false, O.some(false)]);
                        }
                      })
                    )
                  )
                );
              }
            }),
            T.repeatWhile(identity),
            T.fork,
            T.makeInterruptible,
            T.toManaged(F.interrupt)
          )
      ),
      M.tap(({ chunksL, handler }) =>
        handler(pipe(chunksL, T.map(L.map(l))), strategy === "Left" || strategy === "Either")
      ),
      M.tap(({ chunksR, handler }) =>
        handler(pipe(chunksR, T.map(L.map(r))), strategy === "Right" || strategy === "Either")
      ),
      M.map(({ done, handoff }) =>
        pipe(
          T.do,
          T.bindS("done", () => done.get),
          T.bindS("take", (s) =>
            s.done._tag === "Some" && s.done.value
              ? pipe(handoff, H.poll, T.some)
              : pipe(handoff, H.take)
          ),
          T.bindS("result", ({ take }) => Take.done(take)),
          T.map(({ result }) => result)
        )
      )
    )
  );
}

/**
 * Merges this stream and the specified stream together to a common element
 * type with the specified mapping functions.
 *
 * New produced stream will terminate when both specified stream terminate if
 * no termination strategy is specified.
 */
export function mergeWith<R, E, A, R1, E1, B, C, C1>(
  that: Stream<R1, E1, B>,
  l: (a: A) => C,
  r: (b: B) => C1,
  strategy: TerminationStrategy = "Both"
): (ma: Stream<R, E, A>) => Stream<R1 & R, E | E1, C | C1> {
  return (ma) => mergeWith_(ma, that, l, r, strategy);
}

/**
 * Merges this stream and the specified stream together.
 *
 * New produced stream will terminate when both specified stream terminate if no termination
 * strategy is specified.
 */
export function merge_<R, E, A, R1, E1, B>(
  self: Stream<R, E, A>,
  that: Stream<R1, E1, B>,
  strategy: TerminationStrategy = "Both"
): Stream<R1 & R, E | E1, A | B> {
  return mergeWith_(
    self,
    that,
    (a): A | B => a,
    (b) => b,
    strategy
  );
}

/**
 * Merges this stream and the specified stream together.
 *
 * New produced stream will terminate when both specified stream terminate if no termination
 * strategy is specified.
 */
export function merge<R1, E1, B>(
  sb: Stream<R1, E1, B>,
  strategy: TerminationStrategy = "Both"
): <R, E, A>(sa: Stream<R, E, A>) => Stream<R1 & R, E1 | E, B | A> {
  return (sa) => merge_(sa, sb, strategy);
}

/**
 * Merges this stream and the specified stream together. New produced stream will
 * terminate when either stream terminates.
 */
export function mergeTerminateEither_<R, E, A, R1, E1, B>(
  sa: Stream<R, E, A>,
  sb: Stream<R1, E1, B>
): Stream<R1 & R, E | E1, A | B> {
  return merge_(sa, sb, "Either");
}

/**
 * Merges this stream and the specified stream together. New produced stream will
 * terminate when either stream terminates.
 */
export function mergeTerminateEither<R1, E1, B>(
  sb: Stream<R1, E1, B>
): <R, E, A>(sa: Stream<R, E, A>) => Stream<R1 & R, E1 | E, B | A> {
  return (sa) => merge_(sa, sb, "Either");
}

/**
 * Merges this stream and the specified stream together. New produced stream will
 * terminate when this stream terminates.
 */
export function mergeTerminateLeft_<R, E, A, R1, E1, B>(
  sa: Stream<R, E, A>,
  sb: Stream<R1, E1, B>
): Stream<R1 & R, E | E1, A | B> {
  return merge_(sa, sb, "Left");
}

/**
 * Merges this stream and the specified stream together. New produced stream will
 * terminate when this stream terminates.
 */
export function mergeTerminateLeft<R1, E1, B>(
  sb: Stream<R1, E1, B>
): <R, E, A>(sa: Stream<R, E, A>) => Stream<R1 & R, E1 | E, B | A> {
  return (sa) => merge_(sa, sb, "Left");
}

/**
 * Merges this stream and the specified stream together. New produced stream will
 * terminate when the specified stream terminates.
 */
export function mergeTerminateRight_<R, E, A, R1, E1, B>(
  sa: Stream<R, E, A>,
  sb: Stream<R1, E1, B>
): Stream<R1 & R, E | E1, A | B> {
  return merge_(sa, sb, "Right");
}

/**
 * Merges this stream and the specified stream together. New produced stream will
 * terminate when the specified stream terminates.
 */
export function mergeTerminateRight<R1, E1, B>(
  sb: Stream<R1, E1, B>
): <R, E, A>(sa: Stream<R, E, A>) => Stream<R1 & R, E1 | E, B | A> {
  return (sa) => merge_(sa, sb, "Right");
}

/**
 * Merges this stream and the specified stream together to produce a stream of
 * eithers.
 */
export function mergeEither_<R, E, A, R1, E1, B>(
  sa: Stream<R, E, A>,
  sb: Stream<R1, E1, B>,
  strategy: TerminationStrategy = "Both"
): Stream<R & R1, E | E1, Either<A, B>> {
  return mergeWith_(sa, sb, E.left, E.right, strategy);
}

/**
 * Merges this stream and the specified stream together to produce a stream of
 * eithers.
 */
export function mergeEither<R1, E1, B>(
  sb: Stream<R1, E1, B>,
  strategy: TerminationStrategy = "Both"
): <R, E, A>(sa: Stream<R, E, A>) => Stream<R & R1, E1 | E, Either<A, B>> {
  return (sa) => mergeEither_(sa, sb, strategy);
}
