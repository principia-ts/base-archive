import type { Has } from "@principia/core/Has";
import { tag } from "@principia/core/Has";
import type { UIO, URIO } from "@principia/core/IO";
import * as I from "@principia/core/IO";
import { Console } from "@principia/core/IO/Console";
import type { Layer } from "@principia/core/Layer";
import * as L from "@principia/core/Layer";

export interface TestLogger {
  readonly logLine: (line: string) => UIO<void>;
}

export const TestLogger = tag<TestLogger>();

export const fromConsole: Layer<Has<Console>, never, Has<TestLogger>> = L.fromEffect(TestLogger)(
  I.asksService(Console)((console) => ({ logLine: (line) => console.log(line) }))
);

export function logLine(line: string): URIO<Has<TestLogger>, void> {
  return I.asksServiceM(TestLogger)((logger) => logger.logLine(line));
}
