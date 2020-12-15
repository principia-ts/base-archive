import * as E from "@principia/core/Either";
import type { Has } from "@principia/core/Has";
import type { UIO } from "@principia/core/IO";
import * as I from "@principia/core/IO";
import * as C from "@principia/core/IO/Cause";
import type { ExecutionStrategy } from "@principia/core/IO/ExecutionStrategy";
import type { Layer } from "@principia/core/Layer";
import * as M from "@principia/core/Managed";
import { matchTag } from "@principia/core/Utils";
import { flow, pipe } from "@principia/prelude";

import type { Annotated, Annotations } from "./Annotation";
import { TestAnnotationMap } from "./Annotation";
import type { ExecutedSpec } from "./ExecutedSpec";
import * as ES from "./ExecutedSpec";
import * as S from "./Spec";
import * as TF from "./TestFailure";
import type { TestSuccess } from "./TestSuccess";

export interface TestExecutor<R> {
  readonly run: <E>(
    spec: S.XSpec<R & Has<Annotations>, E>,
    defExec: ExecutionStrategy
  ) => UIO<ExecutedSpec<E>>;
  readonly environment: Layer<unknown, never, R>;
}

export function defaultTestExecutor<R>(
  env: Layer<unknown, never, R & Has<Annotations>>
): TestExecutor<R> {
  return {
    run: <E>(
      spec: S.XSpec<R & Has<Annotations>, E>,
      defExec: ExecutionStrategy
    ): UIO<ExecutedSpec<E>> =>
      pipe(
        S.annotated(spec),
        S.giveLayer(env),
        S.foreachExec(
          flow(
            C.failureOrCause,
            E.fold(
              ([failure, annotations]) => I.succeed([E.left(failure), annotations] as const),
              (cause) =>
                I.succeed([E.left(new TF.RuntimeFailure(cause)), TestAnnotationMap.empty] as const)
            )
          ),
          ([success, annotations]) =>
            I.succeed<never, Annotated<E.Either<TF.TestFailure<E>, TestSuccess>>>([
              E.right(success),
              annotations
            ] as const),
          defExec
        ),
        M.use((s) =>
          M.useNow(
            S.foldM_(
              s,
              matchTag({
                Suite: ({ label, specs }) => M.map_(specs, (specs) => ES.suite(label, specs)),
                Test: ({ label, test, annotations }) =>
                  I.toManaged_(
                    I.map_(test, ([result, dynamicAnnotations]) =>
                      ES.test(label, result, annotations.combine(dynamicAnnotations))
                    )
                  )
              }),
              defExec
            )
          )
        )
      ),
    environment: env
  };
}
