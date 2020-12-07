import { pipe } from "@principia/prelude";

import type { Chunk } from "../../Chunk";
import * as I from "../../IO";
import * as Ex from "../../IO/Exit";
import * as Ref from "../../IORef";
import * as M from "../../Managed";
import * as O from "../../Option";
import type { Promise } from "../../Promise";
import * as P from "../../Promise";
import * as Q from "../../Queue";
import { Stream } from "../model";
import * as Pull from "../Pull";
import * as Take from "../Take";
import { toQueue_, toQueueUnbounded } from "./toQueue";

/**
 * Allows a faster producer to progress independently of a slower consumer by buffering
 * up to `capacity` chunks in a queue.
 *
 * @note Prefer capacities that are powers of 2 for better performance.
 */
export function buffer_<R, E, O>(ma: Stream<R, E, O>, capacity: number): Stream<R, E, O> {
  return new Stream(
    pipe(
      M.do,
      M.bindS("done", () => Ref.makeManaged(false)),
      M.bindS("queue", () => toQueue_(ma, capacity)),
      M.map(({ done, queue }) =>
        I.chain_(done.get, (b) =>
          b
            ? Pull.end
            : pipe(
                queue.take,
                I.chain(I.done),
                I.catchSome(
                  O.fold(
                    () => pipe(done.set(true), I.andThen(Pull.end), O.some),
                    (e) => O.some(I.fail(O.some(e)))
                  )
                )
              )
        )
      )
    )
  );
}

/**
 * Allows a faster producer to progress independently of a slower consumer by buffering
 * up to `capacity` chunks in a queue.
 *
 * @note Prefer capacities that are powers of 2 for better performance.
 */
export function buffer(capacity: number): <R, E, O>(ma: Stream<R, E, O>) => Stream<R, E, O> {
  return (ma) => buffer_(ma, capacity);
}

/**
 * Allows a faster producer to progress independently of a slower consumer by buffering
 * elements into an unbounded queue.
 */
export function bufferUnbounded<R, E, O>(ma: Stream<R, E, O>): Stream<R, E, O> {
  return new Stream(
    M.gen(function* (_) {
      const done = yield* _(Ref.makeManaged(false));
      const queue = yield* _(toQueueUnbounded(ma));
      return I.chain_(done.get, (b) =>
        b
          ? Pull.end
          : I.chain_(
              queue.take,
              Take.foldM(() => I.andThen_(done.set(true), Pull.end), Pull.halt, Pull.emitChunk)
            )
      );
    })
  );
}

function bufferSignal_<R, E, O>(
  ma: Stream<R, E, O>,
  queue: Q.Queue<[Take.Take<E, O>, Promise<never, void>]>
): M.Managed<R, never, I.IO<R, O.Option<E>, Chunk<O>>> {
  return pipe(
    M.do,
    M.bindS("as", () => ma.proc),
    M.bindS("start", () => I.toManaged_(P.make<never, void>())),
    M.tap(({ start }) => I.toManaged_(P.succeed_(start, undefined))),
    M.bindS("ref", ({ start }) => I.toManaged_(Ref.make(start))),
    M.bindS("done", () => I.toManaged_(Ref.make(false))),
    M.letS("upstream", ({ as, ref }) => {
      const offer = (take: Take.Take<E, O>): I.UIO<void> =>
        Ex.fold_(
          take,
          (_) =>
            I.gen(function* ($) {
              const latch = yield* $(ref.get);
              yield* $(P.await(latch));
              const p = yield* $(P.make<never, void>());
              yield* $(queue.offer([take, p]));
              yield* $(ref.set(p));
              yield* $(P.await(p));
            }),
          (_) =>
            I.gen(function* ($) {
              const p = yield* $(P.make<never, void>());
              const added = yield* $(queue.offer([take, p]));
              yield* $(I.when_(ref.set(p), () => added));
            })
        );
      return pipe(
        Take.fromPull(as),
        I.tap(offer),
        I.repeatWhile((take) => take !== Take.end),
        I.asUnit
      );
    }),
    M.tap(({ upstream }) => M.fork(I.toManaged_(upstream))),
    M.map(({ done }) =>
      I.chain_(done.get, (b) =>
        b
          ? Pull.end
          : pipe(
              queue.take,
              I.chain(([take, p]) =>
                pipe(
                  P.succeed_(p, undefined),
                  I.andThen(I.when(() => take === Take.end)(done.set(true))),
                  I.andThen(Take.done(take))
                )
              )
            )
      )
    )
  );
}

export function bufferSliding_<R, E, O>(ma: Stream<R, E, O>, capacity = 2): Stream<R, E, O> {
  return new Stream(
    M.gen(function* (_) {
      const queue = yield* _(
        I.toManaged_(
          Q.makeSliding<[Take.Take<E, O>, Promise<never, void>]>(capacity),
          (q) => q.shutdown
        )
      );
      return yield* _(bufferSignal_(ma, queue));
    })
  );
}

export function bufferSliding(capacity = 2): <R, E, O>(ma: Stream<R, E, O>) => Stream<R, E, O> {
  return (ma) => bufferSliding_(ma, capacity);
}

export function bufferDropping_<R, E, O>(ma: Stream<R, E, O>, capacity = 2): Stream<R, E, O> {
  return new Stream(
    M.gen(function* (_) {
      const queue = yield* _(
        I.toManaged_(
          Q.makeDropping<[Take.Take<E, O>, Promise<never, void>]>(capacity),
          (q) => q.shutdown
        )
      );
      return yield* _(bufferSignal_(ma, queue));
    })
  );
}

export function bufferDropping(capacity = 2): <R, E, O>(ma: Stream<R, E, O>) => Stream<R, E, O> {
  return (ma) => bufferSliding_(ma, capacity);
}
