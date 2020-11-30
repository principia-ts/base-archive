import { pipe } from "@principia/prelude";
import { once } from "events";
import type { Writable } from "stream";

import * as A from "../../Array";
import type * as E from "../../Either";
import * as I from "../../IO";
import * as XR from "../../IORef";
import * as M from "../../Managed";
import * as O from "../../Option";
import * as Push from "../Push";
import { Sink } from "./model";

export function fromWritable<I extends string | Buffer | Uint8Array>(
  writable: () => Writable
): Sink<unknown, Error, I, never, void> {
  return new Sink(
    M.gen(function* (_) {
      const writableRef = yield* _(XR.make<O.Option<Writable>>(O.none()));
      const errorRef = yield* _(XR.make<O.Option<Error>>(O.none()));

      // initialize Writable by executing the thunk and catching any initial errors
      yield* _(
        I.async<unknown, never, void>((resolve) => {
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
        })
      );

      // determine if an error was caught in initialization and proceed accordingly
      const maybeError = yield* _(errorRef.get);
      if (O.isSome(maybeError)) {
        return (_: O.Option<ReadonlyArray<I>>) => Push.fail(maybeError.value, A.empty());
      } else {
        return (is: O.Option<ReadonlyArray<I>>) =>
          pipe(
            writableRef.get,
            I.chain(O.fold(() => I.die("Defect: Writable not initialized"), I.succeed)),
            I.chain((w) =>
              O.fold_(
                is,
                () =>
                  pipe(
                    I.total(() => {
                      if (!w.writableEnded) w.end();
                    }),
                    I.andThen(Push.emit<never, void>(undefined, A.empty()))
                  ),
                (in_) =>
                  I.promiseInterrupt<
                    unknown,
                    readonly [E.Either<Error, void>, ReadonlyArray<never>],
                    void
                  >(async (resolve) => {
                    try {
                      const cb = (err: Error | null | undefined) => {
                        err ? resolve(Push.fail(err, A.empty())) : undefined;
                      };
                      for (let i = 0; i < in_.length; i++) {
                        const needsDrain = w.write(in_[i], cb);
                        if (needsDrain) {
                          await once(w, "drain");
                        }
                      }
                      resolve(Push.more);
                    } catch (err) {
                      resolve(Push.fail(err, A.empty()));
                    }

                    return I.total(() => {
                      w.end();
                    });
                  })
              )
            )
          );
      }
    })
  );
}
