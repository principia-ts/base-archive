import type { Option } from "@principia/base/data/Option";

import { pipe } from "@principia/base/data/Function";
import * as O from "@principia/base/data/Option";

import * as C from "../../Chunk";
import * as I from "../../IO";
import * as M from "../../Managed";
import * as XP from "../../Promise";
import * as XQ from "../../Queue";
import * as Semaphore from "../../Semaphore";
import { foreachManaged, Stream } from "../core";
import * as Pull from "../Pull";

/**
 * Maps over elements of the stream with the specified effectful function,
 * executing up to `n` invocations of `f` concurrently. Transformed elements
 * will be emitted in the original order.
 */
export function mapMPar_(n: number) {
  return <R, E, A, R1, E1, B>(
    stream: Stream<R, E, A>,
    f: (a: A) => I.IO<R1, E1, B>
  ): Stream<R & R1, E | E1, B> =>
    new Stream(
      pipe(
        M.do,
        M.bindS("out", () => I.toManaged()(XQ.makeBounded<I.IO<R1, Option<E1 | E>, B>>(n))),
        M.bindS("errorSignal", () => I.toManaged()(XP.make<E1, never>())),
        M.bindS("permits", () => I.toManaged()(Semaphore.make(n))),
        M.tap(({ errorSignal, out, permits }) =>
          pipe(
            stream,
            foreachManaged((a) =>
              pipe(
                I.do,
                I.bindS("p", () => XP.make<E1, B>()),
                I.bindS("latch", () => XP.make<never, void>()),
                I.tap(({ p }) => out.offer(pipe(p, XP.await, I.mapError(O.some)))),
                I.tap(({ latch, p }) =>
                  pipe(
                    latch,
                    // Make sure we start evaluation before moving on to the next element
                    XP.succeed<void>(undefined),
                    I.flatMap(() =>
                      pipe(
                        errorSignal,
                        XP.await,
                        // Interrupt evaluation if another IO fails
                        I.raceFirst(f(a)),
                        // Notify other AIOs of a failure
                        I.tapCause((e) => pipe(errorSignal, XP.halt(e))),
                        // Transfer the result to the consuming stream
                        I.to(p)
                      )
                    ),
                    Semaphore.withPermit(permits),
                    I.fork
                  )
                ),
                I.tap(({ latch }) => XP.await(latch)),
                I.asUnit
              )
            ),
            M.foldCauseM(
              (c) => I.toManaged()(out.offer(Pull.halt(c))),
              () =>
                pipe(
                  Semaphore.withPermits_(I.unit(), n, permits),
                  I.flatMap(() => out.offer(Pull.end)),
                  I.toManaged()
                )
            ),
            M.fork
          )
        ),
        M.map(({ out }) => pipe(out.take, I.flatten, I.map(C.single)))
      )
    );
}

/**
 * Maps over elements of the stream with the specified effectful function,
 * executing up to `n` invocations of `f` concurrently. Transformed elements
 * will be emitted in the original order.
 */
export function mapMPar(
  n: number
): <A, R1, E1, B>(
  f: (a: A) => I.IO<R1, E1, B>
) => <R, E>(stream: Stream<R, E, A>) => Stream<R & R1, E1 | E, B> {
  return (f) => (stream) => mapMPar_(n)(stream, f);
}
