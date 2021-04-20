import type { Annotations } from './Annotation'
import type { ExecutedSpec } from './ExecutedSpec'
import type { TestReporter } from './model'
import type { XSpec } from './Spec'
import type { TestExecutor } from './TestExecutor'
import type { Platform } from '@principia/base/Fiber'
import type { URIO } from '@principia/base/IO'
import type { Layer } from '@principia/base/Layer'
import type { Has } from '@principia/prelude/Has'

import { Clock } from '@principia/base/Clock'
import { Console } from '@principia/base/Console'
import { parallelN } from '@principia/base/ExecutionStrategy'
import * as I from '@principia/base/IO'
import { pipe } from '@principia/prelude/function'

import { defaultTestAnnotationRenderer, report } from './Render'
import { TestLogger } from './TestLogger'

export class TestRunner<R, E> {
  constructor(
    readonly executor: TestExecutor<R>,
    readonly platform: Platform<unknown> = I.defaultRuntime.platform,
    readonly reporter: TestReporter<E> = report(defaultTestAnnotationRenderer),
    readonly bootstrap: Layer<unknown, never, Has<TestLogger> & Has<Clock>> = Console.live['>=>'](
      TestLogger.fromConsole
    )['+++'](Clock.live)
  ) {
    this.run = this.run.bind(this)
  }

  run(spec: XSpec<R & Has<Annotations>, E>): URIO<Has<TestLogger> & Has<Clock>, ExecutedSpec<E>> {
    return pipe(
      this.executor.run(spec, parallelN(10)),
      I.timed,
      I.bind(([duration, results]) => I.as_(this.reporter(duration, results), () => results))
    )
  }
}
