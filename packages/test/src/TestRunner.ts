import type { Has } from "@principia/core/Has";
import type { URIO } from "@principia/core/IO";
import * as I from "@principia/core/IO";
import type { Clock } from "@principia/core/IO/Clock";
import { HasClock, LiveClock } from "@principia/core/IO/Clock";
import { Console, NodeConsole } from "@principia/core/IO/Console";
import { parallel, parallelN } from "@principia/core/IO/ExecutionStrategy";
import type { Platform } from "@principia/core/IO/Fiber";
import type { Layer } from "@principia/core/Layer";
import * as L from "@principia/core/Layer";
import { pipe } from "@principia/prelude";

import type { ExecutedSpec } from "./ExecutedSpec";
import type { Spec, TestReporter } from "./model";
import { report } from "./Render/DefaultTestReporter";
import type { TestExecutor } from "./TestExecutor";
import type { TestLogger } from "./TestLogger";
import { fromConsole } from "./TestLogger";

export class TestRunner<R, E> {
  constructor(
    readonly executor: TestExecutor<R>,
    readonly platform: Platform = I.defaultRuntime.platform,
    readonly reporter: TestReporter<E> = report,
    readonly bootstrap: Layer<unknown, never, Has<TestLogger> & Has<Clock>> = NodeConsole.live[
      ">>>"
    ](fromConsole)["+++"](L.pure(HasClock)(new LiveClock()))
  ) {}

  run(spec: Spec<R, E>): URIO<Has<TestLogger> & Has<Clock>, ExecutedSpec<E>> {
    return pipe(
      this.executor.run(spec, parallel),
      I.timed,
      I.chain(([duration, results]) => I.as_(this.reporter(duration, results), () => results))
    );
  }
}
