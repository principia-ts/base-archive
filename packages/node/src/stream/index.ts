import * as E from "@principia/core/Either";
import * as I from "@principia/core/IO";
import * as Ref from "@principia/core/IORef";
import * as M from "@principia/core/Managed";
import * as O from "@principia/core/Option";
import * as Queue from "@principia/core/Queue";
import * as S from "@principia/core/Stream";
import * as Push from "@principia/core/Stream/Push";
import * as Sink from "@principia/core/Stream/Sink";
import { once } from "events";
import type * as stream from "stream";
import { inspect } from "util";

function readableDataCb(
  queue: Queue.Queue<E.Either<Error, O.Option<Buffer>>>
): (data: Buffer) => void {
  return (data) => I.run(queue.offer(E.right(O.some(data))));
}

function readableErrorCb(
  queue: Queue.Queue<E.Either<Error, O.Option<Buffer>>>
): (err: Error) => void {
  return (err) => I.run(queue.offer(E.left(err)));
}

function readableEndCb(queue: Queue.Queue<E.Either<Error, O.Option<Buffer>>>): () => void {
  return () => I.run(queue.offer(E.right(O.none())));
}

/**
 * Captures a Node `Readable`, converting it into a `Stream`
 *
 * @category Node
 * @since 1.0.0
 */
export function streamFromReadable(r: () => stream.Readable): S.Stream<unknown, Error, Buffer> {
  return S.chain_(S.fromEffect(I.partial_(r, (err) => err as Error)), (capuredReadable) =>
    S.chain_(
      S.bracket_(
        I.gen(function* ($) {
          const q = yield* $(Queue.makeUnbounded<E.Either<Error, O.Option<Buffer>>>());
          yield* $(
            I.total(() => {
              capuredReadable.on("data", readableDataCb(q));
              capuredReadable.on("error", readableErrorCb(q));
              capuredReadable.on("end", readableEndCb(q));
            })
          );
          return q;
        }),
        (q) =>
          I.andThen_(
            q.shutdown,
            I.total(() => {
              capuredReadable.destroy();
            })
          )
      ),
      (q) =>
        S.repeatEffectOption(
          I.chain_(
            q.take,
            E.fold(
              (err) => I.fail(O.some(err)),
              O.fold(() => I.fail(O.none()), I.succeed)
            )
          )
        )
    )
  );
}

/**
 * Captures a Node `Writable`, converting it into a `Sink`
 *
 * @category Node
 * @since 1.0.0
 */
export function sinkFromWritable(
  w: () => stream.Writable
): Sink.Sink<unknown, Error, Buffer, never, void> {
  return new Sink.Sink(
    M.gen(function* ($) {
      const hasErrorOnOpen = yield* $(Ref.make<O.Option<Error>>(O.none()));
      const capturedWritable = yield* $(
        M.makeExit_(
          I.async<unknown, never, stream.Writable | void>((cb) => {
            /**
             * @todo This is a bit of a mess! Writable will not throw an error immediately,
             * but also does not have a "ready" event that we can wait for.
             * I resorted to calling the callback to `IO.async` inside of a `setImmediate`,
             * and calling `clearImmediate` on an error. This may not be a good idea
             * and I will revisit this. Errors will be caught either way, but they
             * may not be the most informative ones
             */
            const cw = w().once("error", (err) => {
              clearImmediate(next);
              cb(hasErrorOnOpen.set(O.some(err)));
            });
            const next = setImmediate(() => {
              cb(I.succeed(cw));
            });
          }),
          (w) =>
            w
              ? I.total(() => {
                  w.end();
                })
              : I.unit()
        )
      );

      const errorOption = yield* $(hasErrorOnOpen.get);
      if (O.isSome(errorOption)) {
        return (_: O.Option<ReadonlyArray<Buffer>>) => Push.fail(errorOption.value, []);
      } else {
        return (is: O.Option<ReadonlyArray<Buffer>>) =>
          O.fold_(
            is,
            () => Push.emit(undefined, []),
            (bufs) =>
              I.async<unknown, readonly [E.Either<Error, void>, ReadonlyArray<never>], void>(
                async (cb) => {
                  try {
                    const needsDrain = !(capturedWritable as stream.Writable).write(
                      Buffer.concat(bufs),
                      (err) => (err ? cb(Push.fail(err, [])) : undefined)
                    );
                    if (needsDrain) {
                      await once(capturedWritable as stream.Writable, "drain");
                    }
                    cb(Push.more);
                  } catch (err) {
                    cb(Push.fail(err, []));
                  }
                }
              )
          );
      }
    })
  );
}
