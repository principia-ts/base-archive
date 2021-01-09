import type { Annotated, Annotations } from './Annotation'
import type { ExecutedSpec } from './ExecutedSpec'
import type { TestSuccess } from './TestSuccess'
import type { Has } from '@principia/base/Has'
import type { ExecutionStrategy } from '@principia/io/ExecutionStrategy'
import type { UIO } from '@principia/io/IO'
import type { Layer } from '@principia/io/Layer'

import * as E from '@principia/base/Either'
import { flow, pipe } from '@principia/base/Function'
import { matchTag } from '@principia/base/util/matchers'
import * as C from '@principia/io/Cause'
import * as I from '@principia/io/IO'
import * as M from '@principia/io/Managed'

import { TestAnnotationMap } from './Annotation'
import * as ES from './ExecutedSpec'
import * as S from './Spec'
import * as TF from './TestFailure'

export interface TestExecutor<R> {
  readonly run: <E>(spec: S.XSpec<R & Has<Annotations>, E>, defExec: ExecutionStrategy) => UIO<ExecutedSpec<E>>
  readonly environment: Layer<unknown, never, R>
}

export function defaultTestExecutor<R>(env: Layer<unknown, never, R & Has<Annotations>>): TestExecutor<R> {
  return {
    run: <E>(spec: S.XSpec<R & Has<Annotations>, E>, defExec: ExecutionStrategy): UIO<ExecutedSpec<E>> =>
      pipe(
        S.annotated(spec),
        S.giveLayer(env),
        S.foreachExec(
          flow(
            C.failureOrCause,
            E.fold(
              ([failure, annotations]) => I.succeed([E.left(failure), annotations] as const),
              (cause) => I.succeed([E.left(new TF.RuntimeFailure(cause)), TestAnnotationMap.empty] as const)
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
  }
}
