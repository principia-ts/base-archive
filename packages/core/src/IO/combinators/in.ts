import { pipe } from "@principia/prelude";

import * as A from "../../Array/_core";
import * as O from "../../Option";
import { chain } from "../_core";
import * as F from "../Fiber";
import type { IO } from "../model";
import type { Scope } from "../Scope";
import { forkDaemon } from "./core-scope";
import { onInterrupt, uninterruptibleMask } from "./interrupt";

export function in_<R, E, A>(io: IO<R, E, A>, scope: Scope<any>): IO<R, E, A> {
  return uninterruptibleMask(({ restore }) =>
    pipe(
      io,
      restore,
      forkDaemon,
      chain((executor) =>
        pipe(
          scope.extend(executor.scope),
          chain(() =>
            pipe(
              restore(F.join(executor)),
              onInterrupt((interruptors) =>
                pipe(
                  Array.from(interruptors),
                  A.head,
                  O.fold(
                    () => F.interrupt(executor),
                    (id) => executor.interruptAs(id)
                  )
                )
              )
            )
          )
        )
      )
    )
  );
}

function _in(scope: Scope<any>): <R, E, A>(io: IO<R, E, A>) => IO<R, E, A> {
  return (io) => in_(io, scope);
}

export { _in as in };
