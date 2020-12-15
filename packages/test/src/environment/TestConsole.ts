import type { UIO } from "@principia/core/IO";
import type { Console } from "@principia/core/IO/Console";
import type { FiberRef } from "@principia/core/IO/FiberRef";
import type { URef } from "@principia/core/IORef";
import * as Ref from "@principia/core/IORef";
import * as L from "@principia/core/List";

export class TestConsole implements Console {
  putStrLn(line: string): UIO<void> {
    return Ref.update_(
      this.consoleState,
      (data) =>
        new ConsoleData(
          data.input,
          L.append_(data.output, `${line}\n`),
          data.errOutput,
          data.debugOutput
        )
    );
  }
  putStrLnErr(line: string): UIO<void> {
    return Ref.update_(
      this.consoleState,
      (data) =>
        new ConsoleData(
          data.input,
          data.output,
          L.append_(data.errOutput, `${line}\n`),
          data.debugOutput
        )
    );
  }
  putStrLnDebug(line: string): UIO<void> {
    return Ref.update_(
      this.consoleState,
      (data) =>
        new ConsoleData(
          data.input,
          data.output,
          data.errOutput,
          L.append_(data.debugOutput, `${line}\n`)
        )
    );
  }
  constructor(readonly consoleState: URef<ConsoleData>, readonly debugState: FiberRef<boolean>) {}
}

export class ConsoleData {
  constructor(
    readonly input: L.List<string> = L.empty(),
    readonly output: L.List<string> = L.empty(),
    readonly errOutput: L.List<string> = L.empty(),
    readonly debugOutput: L.List<string> = L.empty()
  ) {}
}
