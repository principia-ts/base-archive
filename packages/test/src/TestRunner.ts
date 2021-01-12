import type { Annotations } from './Annotation'
import type { ExecutedSpec } from './ExecutedSpec'
import type { TestReporter } from './model'
import type { XSpec } from './Spec'
import type { TestExecutor } from './TestExecutor'
import type { TestLogger } from './TestLogger'
import type { Has } from '@principia/base/Has'
import type { Platform } from '@principia/io/Fiber'
import type { URIO } from '@principia/io/IO'
import type { Layer } from '@principia/io/Layer'

import { pipe } from '@principia/base/Function'
import { Clock, LiveClock } from '@principia/io/Clock'
import { NodeConsole } from '@principia/io/Console'
import { parallel } from '@principia/io/ExecutionStrategy'
import * as I from '@principia/io/IO'
import * as L from '@principia/io/Layer'

import { defaultTestAnnotationRenderer, report } from './Render'
import { fromConsole } from './TestLogger'

export class TestRunner<R, E> {
  constructor(
    readonly executor: TestExecutor<R>,
    readonly platform: Platform = I.defaultRuntime.platform,
    readonly reporter: TestReporter<E> = report(defaultTestAnnotationRenderer),
    readonly bootstrap: Layer<unknown, never, Has<TestLogger> & Has<Clock>> = NodeConsole.live['>>>'](fromConsole)[
      '+++'
    ](L.succeed(Clock)(new LiveClock()))
  ) {}

  run(spec: XSpec<R & Has<Annotations>, E>): URIO<Has<TestLogger> & Has<Clock>, ExecutedSpec<E>> {
    return pipe(
      this.executor.run(spec, parallel),
      I.timed,
      I.flatMap(([duration, results]) => I.as_(this.reporter(duration, results), () => results))
    )
  }
}
