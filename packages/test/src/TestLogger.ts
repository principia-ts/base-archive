import type { Has } from '@principia/base/Has'
import type { Console } from '@principia/io/Console'
import type { UIO, URIO } from '@principia/io/IO'
import type { Layer } from '@principia/io/Layer'

import { tag } from '@principia/base/Has'
import { ConsoleTag } from '@principia/io/Console'
import * as I from '@principia/io/IO'
import * as L from '@principia/io/Layer'

export abstract class TestLogger {
  abstract logLine(line: string): UIO<void>
  static get fromConsole(): Layer<Has<Console>, never, Has<TestLogger>> {
    return L.fromEffect(TestLoggerTag)(
      I.asksService(ConsoleTag)((console) => ({ logLine: (line) => console.putStrLn(line) }))
    )
  }
  static logLine(line: string): URIO<Has<TestLogger>, void> {
    return I.asksServiceM(TestLoggerTag)((logger) => logger.logLine(line))
  }
}

export const TestLoggerTag = tag<TestLogger>()
