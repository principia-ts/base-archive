import type { Has } from '@principia/base/data/Has'
import type { UIO, URIO } from '@principia/io/IO'
import type { Layer } from '@principia/io/Layer'

import { tag } from '@principia/base/data/Has'
import { Console } from '@principia/io/Console'
import * as I from '@principia/io/IO'
import * as L from '@principia/io/Layer'

export interface TestLogger {
  readonly logLine: (line: string) => UIO<void>
}

export const TestLogger = tag<TestLogger>()

export const fromConsole: Layer<Has<Console>, never, Has<TestLogger>> = L.fromEffect(TestLogger)(
  I.asksService(Console)((console) => ({ logLine: (line) => console.putStrLn(line) }))
)

export function logLine(line: string): URIO<Has<TestLogger>, void> {
  return I.asksServiceM(TestLogger)((logger) => logger.logLine(line))
}
