import type { Console } from '@principia/io/Console'
import type { FiberRef } from '@principia/io/FiberRef'
import type { IO, UIO } from '@principia/io/IO'
import type { URef } from '@principia/io/IORef'

import * as A from '@principia/base/Array'
import { pipe } from '@principia/base/Function'
import { tag } from '@principia/base/Has'
import * as L from '@principia/base/List'
import * as Ref from '@principia/io/IORef'
import { inspect } from 'util'

export abstract class TestConsole implements Console {
  put(...input: any[]): UIO<void> {
    return Ref.update_(
      this.consoleState,
      (data) =>
        new ConsoleData(
          data.input,
          pipe(
            input,
            A.foldl(L.empty(), (b, a) => L.append_(b, inspect(a, { colors: false })))
          ),
          data.errOutput,
          data.debugOutput
        )
    )
  }
  putStrLn(line: string): UIO<void> {
    return Ref.update_(
      this.consoleState,
      (data) => new ConsoleData(data.input, L.append_(data.output, `${line}\n`), data.errOutput, data.debugOutput)
    )
  }
  putStrLnErr(line: string): UIO<void> {
    return Ref.update_(
      this.consoleState,
      (data) => new ConsoleData(data.input, data.output, L.append_(data.errOutput, `${line}\n`), data.debugOutput)
    )
  }
  putStrLnDebug(line: string): UIO<void> {
    return Ref.update_(
      this.consoleState,
      (data) => new ConsoleData(data.input, data.output, data.errOutput, L.append_(data.debugOutput, `${line}\n`))
    )
  }
  abstract clearInput: UIO<void>
  abstract clearOutput: UIO<void>
  abstract debug<R, E, A>(io: IO<R, E, A>): IO<R, E, A>
  abstract feedLines(...lines: ReadonlyArray<string>): UIO<void>
  abstract output: UIO<ReadonlyArray<string>>
  abstract outputErr: UIO<ReadonlyArray<string>>
  abstract silent<R, E, A>(io: IO<R, E, A>): IO<R, E, A>
  constructor(readonly consoleState: URef<ConsoleData>, readonly debugState: FiberRef<boolean>) {}
}

export const TestConsoleTag = tag(TestConsole)

export class ConsoleData {
  constructor(
    readonly input: L.List<string> = L.empty(),
    readonly output: L.List<string> = L.empty(),
    readonly errOutput: L.List<string> = L.empty(),
    readonly debugOutput: L.List<string> = L.empty()
  ) {}
}
