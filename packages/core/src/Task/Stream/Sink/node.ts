import { pipe } from "@principia/prelude";
import { once } from "events";
import type { Writable } from "stream";

import * as A from "../../../Array";
import type * as E from "../../../Either";
import * as O from "../../../Option";
import * as T from "../../../Task";
import * as M from "../../Managed";
import * as XR from "../../XRef";
import * as Push from "../internal/Push";
import { Sink } from "./model";

export function fromWritable<I extends string | Buffer | Uint8Array>(
  writable: () => Writable
): Sink<unknown, Error, I, I, void> {
  return new Sink(
    M.gen(function* (_) {
      const writableRef = yield* _(XR.make<O.Option<Writable>>(O.none()));
      const errorRef = yield* _(XR.make<O.Option<Error>>(O.none()));
      const initWritable = T.async<unknown, never, void>((resolve) => {
        try {
          const wr = writable();
          wr.on("error", (err) => {
            resolve(errorRef.set(O.some(err)));
          });
          setImmediate(() => {
            wr.removeAllListeners("error");
            resolve(writableRef.set(O.some(wr)));
          });
        } catch (err) {
          resolve(errorRef.set(O.some(err)));
        }
      });
      yield* _(initWritable);
      return yield* _(
        T.ifM_(
          pipe(errorRef.get, T.map(O.isSome)),
          () =>
            T.succeed(
              (
                _: O.Option<ReadonlyArray<I>>
              ): T.Task<unknown, readonly [E.Either<Error, void>, ReadonlyArray<I>], void> =>
                T.chain_(errorRef.get, (a) => Push.fail((a as O.Some<Error>).value, A.empty()))
            ),
          () =>
            T.succeed(
              (
                is: O.Option<ReadonlyArray<I>>
              ): T.Task<unknown, readonly [E.Either<Error, void>, ReadonlyArray<I>], void> =>
                pipe(
                  writableRef.get,
                  T.chain(O.fold(() => T.die("Writable not initialized"), T.succeed)),
                  T.chain((w) =>
                    O.fold_(
                      is,
                      () =>
                        pipe(
                          T.total(() => {
                            if (!w.writableEnded) w.end();
                          }),
                          T.andThen(Push.emit<I, void>(undefined, A.empty()))
                        ),
                      (in_) =>
                        T.async<unknown, readonly [E.Either<Error, void>, ReadonlyArray<I>], void>(
                          async (resolve) => {
                            try {
                              const listen = (err: Error) => {
                                resolve(Push.fail(err, A.empty()));
                              };
                              w.on("error", listen);
                              for (let i = 0; i < in_.length; i++) {
                                if (!w.write(in_[i])) {
                                  await once(w, "drain");
                                }
                              }
                              w.removeListener("error", listen);
                              resolve(Push.more);
                            } catch (err) {
                              resolve(Push.fail(err, A.empty()));
                            }
                          }
                        )
                    )
                  )
                )
            )
        )
      );
    })
  );
}

export function fromWritableWithoutClose<I extends string | Buffer | Uint8Array>(
  writable: () => Writable
): Sink<unknown, Error, I, I, void> {
  return new Sink(
    M.gen(function* (_) {
      const writableRef = yield* _(XR.make<O.Option<Writable>>(O.none()));
      const errorRef = yield* _(XR.make<O.Option<Error>>(O.none()));
      const initWritable = T.async<unknown, never, void>((resolve) => {
        function onError(err: Error) {
          resolve(errorRef.set(O.some(err)));
        }
        try {
          const wr = writable();
          wr.on("error", onError);
          setImmediate(() => {
            wr.removeListener("error", onError);
            resolve(writableRef.set(O.some(wr)));
          });
        } catch (err) {
          resolve(errorRef.set(O.some(err)));
        }
      });
      yield* _(initWritable);
      return yield* _(
        T.ifM_(
          pipe(errorRef.get, T.map(O.isSome)),
          () =>
            T.succeed(
              (
                _: O.Option<ReadonlyArray<I>>
              ): T.Task<unknown, readonly [E.Either<Error, void>, ReadonlyArray<I>], void> =>
                T.chain_(errorRef.get, (a) => Push.fail((a as O.Some<Error>).value, A.empty()))
            ),
          () =>
            T.succeed(
              (
                is: O.Option<ReadonlyArray<I>>
              ): T.Task<unknown, readonly [E.Either<Error, void>, ReadonlyArray<I>], void> =>
                pipe(
                  writableRef.get,
                  T.chain(O.fold(() => T.die("Writable not initialized"), T.succeed)),
                  T.chain((w) =>
                    O.fold_(
                      is,
                      () => Push.emit<I, void>(undefined, A.empty()),
                      (in_) =>
                        T.async<unknown, readonly [E.Either<Error, void>, ReadonlyArray<I>], void>(
                          async (resolve) => {
                            try {
                              const listen = (err: Error) => {
                                resolve(Push.fail(err, A.empty()));
                              };
                              w.on("error", listen);
                              for (let i = 0; i < in_.length; i++) {
                                if (!w.write(in_[i])) {
                                  await once(w, "drain");
                                }
                              }
                              w.removeListener("error", listen);
                              resolve(Push.more);
                            } catch (err) {
                              resolve(Push.fail(err, A.empty()));
                            }
                          }
                        )
                    )
                  )
                )
            )
        )
      );
    })
  );
}
