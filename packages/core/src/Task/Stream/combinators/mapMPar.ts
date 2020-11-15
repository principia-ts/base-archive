import { pipe } from "../../../Function";
import * as L from "../../../List";
import type { Option } from "../../../Option";
import * as O from "../../../Option";
import * as M from "../../Managed";
import * as Semaphore from "../../Semaphore";
import * as T from "../../Task";
import * as XP from "../../XPromise";
import * as XQ from "../../XQueue";
import { foreachManaged } from "../destructors";
import * as Pull from "../internal/Pull";
import { Stream } from "../model";

/**
 * Maps over elements of the stream with the specified effectful function,
 * executing up to `n` invocations of `f` concurrently. Transformed elements
 * will be emitted in the original order.
 */
export function mapMPar_(n: number) {
   return <R, E, A, R1, E1, B>(stream: Stream<R, E, A>, f: (a: A) => T.Task<R1, E1, B>): Stream<R & R1, E | E1, B> =>
      new Stream(
         pipe(
            M.do,
            M.bindS("out", () => T.toManaged()(XQ.makeBounded<T.Task<R1, Option<E1 | E>, B>>(n))),
            M.bindS("errorSignal", () => T.toManaged()(XP.make<E1, never>())),
            M.bindS("permits", () => T.toManaged()(Semaphore.makeSemaphore(n))),
            M.tap(({ errorSignal, out, permits }) =>
               pipe(
                  stream,
                  foreachManaged((a) =>
                     pipe(
                        T.do,
                        T.bindS("p", () => XP.make<E1, B>()),
                        T.bindS("latch", () => XP.make<never, void>()),
                        T.tap(({ p }) => out.offer(pipe(p, XP.await, T.mapError(O.some)))),
                        T.tap(({ latch, p }) =>
                           pipe(
                              latch,
                              // Make sure we start evaluation before moving on to the next element
                              XP.succeed<void>(undefined),
                              T.chain(() =>
                                 pipe(
                                    errorSignal,
                                    XP.await,
                                    // Interrupt evaluation if another task fails
                                    T.raceFirst(f(a)),
                                    // Notify other tasks of a failure
                                    T.tapCause((e) => pipe(errorSignal, XP.halt(e))),
                                    // Transfer the result to the consuming stream
                                    T.to(p)
                                 )
                              ),
                              Semaphore.withPermit(permits),
                              T.fork
                           )
                        ),
                        T.tap(({ latch }) => XP.await(latch)),
                        T.asUnit
                     )
                  ),
                  M.foldCauseM(
                     (c) => T.toManaged()(out.offer(Pull.halt(c))),
                     () =>
                        pipe(
                           Semaphore.withPermits(n)(permits)(T.unit()),
                           T.chain(() => out.offer(Pull.end)),
                           T.toManaged()
                        )
                  ),
                  M.fork
               )
            ),
            M.map(({ out }) => pipe(out.take, T.flatten, T.map(L.list)))
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
): <A, R1, E1, B>(f: (a: A) => T.Task<R1, E1, B>) => <R, E>(stream: Stream<R, E, A>) => Stream<R & R1, E1 | E, B> {
   return (f) => (stream) => mapMPar_(n)(stream, f);
}
