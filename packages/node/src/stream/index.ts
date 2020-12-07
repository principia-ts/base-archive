import type { Byte } from "@principia/core/Byte";
import * as C from "@principia/core/Chunk";
import { pipe, tuple } from "@principia/core/Function";
import * as I from "@principia/core/IO";
import * as M from "@principia/core/Managed";
import * as O from "@principia/core/Option";
import * as S from "@principia/core/Stream";
import * as Push from "@principia/core/Stream/Push";
import * as Sink from "@principia/core/Stream/Sink";
import type * as stream from "stream";

export class ReadableError {
  readonly _tag = "ReadableError";
  constructor(readonly error: Error) {}
}

/**
 * Captures a Node `Readable`, converting it into a `Stream`
 *
 * @category Node
 * @since 1.0.0
 */
export function streamFromReadable(
  r: () => stream.Readable
): S.Stream<unknown, ReadableError, Byte> {
  return S.chain_(
    S.bracket_(
      pipe(
        I.partial_(r, (err) => new ReadableError(err as Error)),
        I.tap((sr) =>
          sr.readableEncoding != null
            ? I.dieMessage(
                `stream.Readable encoding set to ${sr.readableEncoding} cannot be used to produce Buffer`
              )
            : I.unit()
        )
      ),
      (sr) =>
        I.total(() => {
          sr.destroy();
        })
    ),
    (sr) =>
      S.async<unknown, ReadableError, Byte>((cb) => {
        sr.on("data", (chunk) => {
          cb(I.succeed(chunk));
        });
        sr.on("error", (err) => {
          cb(I.fail(O.some(new ReadableError(err))));
        });
        sr.on("end", () => {
          cb(I.fail(O.none()));
        });
      })
  );
}

export class WritableError {
  readonly _tag = "WritableError";
  constructor(readonly error: Error) {}
}

/**
 * Captures a Node `Writable`, converting it into a `Sink`
 *
 * @category Node
 * @since 1.0.0
 */
export function sinkFromWritable(
  w: () => stream.Writable
): Sink.Sink<unknown, WritableError, Byte, never, void> {
  return new Sink.Sink(
    M.map_(
      M.makeExit_(
        I.async<unknown, never, stream.Writable>((cb) => {
          const onError = (err: Error) => {
            clearImmediate(im);
            cb(I.die(err));
          };
          const sw = w().once("error", onError);
          const im = setImmediate(() => {
            sw.removeListener("error", onError);
            cb(I.succeed(sw));
          });
        }),
        (sw) =>
          I.total(() => {
            sw.destroy();
          })
      ),
      (sw) =>
        O.fold(
          () => Push.emit(undefined, []),
          (chunk) =>
            I.async((cb) => {
              sw.write(chunk, (err) =>
                err ? cb(Push.fail(new WritableError(err), [])) : cb(Push.more)
              );
            })
        )
    )
  );
}

export class TransformError {
  readonly _tag = "TransformError";
  constructor(readonly error: Error) {}
}

export function transform(
  tr: () => stream.Transform
): <R, E>(stream: S.Stream<R, E, Byte>) => S.Stream<R, E | TransformError, Byte> {
  return <R, E>(stream: S.Stream<R, E, Byte>) => {
    const managedSink = pipe(
      I.total(tr),
      M.makeExit((st) =>
        I.total(() => {
          st.destroy();
        })
      ),
      M.map((st) =>
        tuple(
          st,
          Sink.fromPush<unknown, TransformError, Byte, never, void>(
            O.fold(
              () =>
                I.chain_(
                  I.total(() => {
                    st.end();
                  }),
                  () => Push.emit(undefined, [])
                ),
              (chunk) =>
                I.async((cb) => {
                  st.write(C.asBuffer(chunk), (err) =>
                    err ? cb(Push.fail(new TransformError(err), [])) : cb(Push.more)
                  );
                })
            )
          )
        )
      )
    );
    return pipe(
      S.managed(managedSink),
      S.chain(([transform, sink]) =>
        S.asyncM<unknown, TransformError, Byte, R, E | TransformError>((cb) =>
          I.andThen_(
            I.total(() => {
              transform.on("data", (chunk) => {
                cb(I.succeed(chunk));
              });
              transform.on("error", (err) => {
                cb(I.fail(O.some(new TransformError(err))));
              });
              transform.on("end", () => {
                cb(I.fail(O.none()));
              });
            }),
            S.run_(stream, sink)
          )
        )
      )
    );
  };
}
