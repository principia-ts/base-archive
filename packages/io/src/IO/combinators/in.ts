import type { Scope } from "../../Scope";
import type { IO } from "../core";

import * as A from "@principia/base/data/Array";
import { pipe } from "@principia/base/data/Function";
import * as O from "@principia/base/data/Option";

import * as F from "../../Fiber";
import { flatMap } from "../core";
import { forkDaemon } from "./core-scope";
import { onInterrupt, uninterruptibleMask } from "./interrupt";

export function in_<R, E, A>(io: IO<R, E, A>, scope: Scope<any>): IO<R, E, A> {
  return uninterruptibleMask(({ restore }) =>
    pipe(
      io,
      restore,
      forkDaemon,
      flatMap((executor) =>
        pipe(
          scope.extend(executor.scope),
          flatMap(() =>
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
