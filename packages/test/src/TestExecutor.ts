import * as E from "@principia/core/Either";
import type { UIO } from "@principia/core/IO";
import * as I from "@principia/core/IO";
import * as C from "@principia/core/IO/Cause";
import type { ExecutionStrategy } from "@principia/core/IO/ExecutionStrategy";
import type { Layer } from "@principia/core/Layer";
import * as M from "@principia/core/Managed";
import { matchTag } from "@principia/core/Utils";
import { flow, pipe } from "@principia/prelude";

import type { ExecutedSpec } from "./ExecutedSpec";
import * as ES from "./ExecutedSpec";
import type { Spec } from "./model";
import * as S from "./Spec";
import * as TF from "./TestFailure";

export interface TestExecutor<R> {
  readonly run: <E>(spec: Spec<R, E>, defExec: ExecutionStrategy) => UIO<ExecutedSpec<E>>;
  readonly environment: Layer<unknown, never, R>;
}

export function defaultTestExecutor<R>(env: Layer<unknown, never, R>): TestExecutor<R> {
  return {
    run: (spec, defExec) =>
      pipe(
        spec,
        S.giveLayer(env),
        S.foreachExec(
          flow(
            C.failureOrCause,
            E.fold(
              (failure) => I.succeed(E.left(failure)),
              (cause) => I.succeed(E.left(new TF.RuntimeFailure(cause)))
            )
          ),
          (success) => I.succeed(E.right(success)),
          defExec
        ),
        M.use((s) =>
          M.useNow(
            S.foldM_(
              s,
              matchTag({
                Suite: ({ label, specs }) => M.map_(specs, (specs) => ES.suite(label, specs)),
                Test: ({ label, test }) =>
                  I.toManaged_(I.map_(test, (result) => ES.test(label, result)))
              }),
              defExec
            )
          )
        )
      ),
    environment: env
  };
}
