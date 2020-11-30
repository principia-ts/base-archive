import * as A from "../../Array";
import type { Either } from "../../Either";
import * as E from "../../Either";
import { identity, pipe } from "../../Function";
import * as I from "../../IO";
import type { Cause } from "../../IO/Cause";
import * as C from "../../IO/Cause";
import * as Ex from "../../IO/Exit";
import * as F from "../../IO/Fiber";
import * as RM from "../../IORefM";
import * as M from "../../Managed";
import * as O from "../../Option";
import * as H from "../Handoff";
import { Stream } from "../model";
import type * as Pull from "../Pull";
import * as Take from "../Take";

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
      M.bindS("handoff", () => M.fromEffect(H.make<Take.Take<E | E1, C | C1>>())),
      M.bindS("done", () => M.fromEffect(RM.make<O.Option<boolean>>(O.none()))),
      M.bindS("chunksL", () => sa.proc),
      M.bindS("chunksR", () => sb.proc),
      M.letS(
        "handler",
        ({ done, handoff }) => (pull: Pull.Pull<R & R1, E | E1, C | C1>, terminate: boolean) =>
          pipe(
            done.get,
            I.chain((o) => {
              if (o._tag === "Some" && o.value) {
                return I.succeed(false);
              } else {
                return pipe(
                  pull,
                  I.result,
                  I.chain((exit) =>
                    pipe(
                      done,
                      RM.modify((o) => {
                        const causeOrChunk = pipe(
                          exit,
                          Ex.fold(
                            (c): Either<O.Option<Cause<E | E1>>, ReadonlyArray<C | C1>> =>
                              E.left(C.sequenceCauseOption(c)),
                            E.right
                          )
                        );

                        if (o._tag === "Some" && o.value) {
                          return I.succeed([false, o]);
                        } else if (causeOrChunk._tag === "Right") {
                          return pipe(
                            handoff,
                            H.offer(<Take.Take<E | E1, C | C1>>Take.chunk(causeOrChunk.right)),
                            I.as(() => [true, o])
                          );
                        } else if (
                          causeOrChunk._tag === "Left" &&
                          causeOrChunk.left._tag === "Some"
                        ) {
                          return pipe(
                            handoff,
                            H.offer(<Take.Take<E | E1, C | C1>>Take.halt(causeOrChunk.left.value)),
                            I.as(() => [false, O.some(true)])
                          );
                        } else if (
                          causeOrChunk._tag === "Left" &&
                          causeOrChunk.left._tag === "None" &&
                          (terminate || o._tag === "Some")
                        ) {
                          return pipe(
                            handoff,
                            H.offer(<Take.Take<E | E1, C | C1>>Take.end),
                            I.as(() => [false, O.some(true)])
                          );
                        } else {
                          return I.succeed([false, O.some(false)]);
                        }
                      })
                    )
                  )
                );
              }
            }),
            I.repeatWhile(identity),
            I.fork,
            I.makeInterruptible,
            I.toManaged(F.interrupt)
          )
      ),
      M.tap(({ chunksL, handler }) =>
        handler(pipe(chunksL, I.map(A.map(l))), strategy === "Left" || strategy === "Either")
      ),
      M.tap(({ chunksR, handler }) =>
        handler(pipe(chunksR, I.map(A.map(r))), strategy === "Right" || strategy === "Either")
      ),
      M.map(({ done, handoff }) =>
        pipe(
          I.do,
          I.bindS("done", () => done.get),
          I.bindS("take", (s) =>
            s.done._tag === "Some" && s.done.value
              ? pipe(handoff, H.poll, I.some)
              : pipe(handoff, H.take)
          ),
          I.bindS("result", ({ take }) => Take.done(take)),
          I.map(({ result }) => result)
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
