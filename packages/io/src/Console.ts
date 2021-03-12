import { tag } from '@principia/base/Has'

import * as I from './IO/core'
import * as L from './Layer/core'

export const ConsoleTag = tag<Console>()

export abstract class Console {
  abstract readonly put: (...data: any[]) => I.UIO<void>
  abstract readonly putStrLn: (line: string) => I.UIO<void>
  abstract readonly putStrLnErr: (line: string) => I.UIO<void>
  abstract readonly putStrLnDebug: (line: string) => I.UIO<void>

  static live = L.succeed(ConsoleTag)(
    new (class extends Console {
      put           = (...data: any[]) => I.effectTotal(() => console.log(...data))
      putStrLn      = (line: string) => I.effectTotal(() => console.log(line))
      putStrLnErr   = (line: string) => I.effectTotal(() => console.error(line))
      putStrLnDebug = (line: string) => I.effectTotal(() => console.debug(line))
    })()
  )

  static put           = I.deriveLifted(ConsoleTag)(['put'], [], []).put
  static putStrLn      = I.deriveLifted(ConsoleTag)(['putStrLn'], [], []).putStrLn
  static putStrLnErr   = I.deriveLifted(ConsoleTag)(['putStrLnErr'], [], []).putStrLnErr
  static putStrLnDebug = I.deriveLifted(ConsoleTag)(['putStrLnDebug'], [], []).putStrLnDebug
}

export class LiveConsole implements Console {
  put(...data: any[]): I.UIO<void> {
    return I.effectTotal(() => console.log(...data))
  }
  putStrLn(line: string): I.UIO<void> {
    return I.effectTotal(() => console.log(line))
  }
  putStrLnErr(line: string): I.UIO<void> {
    return I.effectTotal(() => console.error(line))
  }
  putStrLnDebug(line: string): I.UIO<void> {
    return I.effectTotal(() => console.debug(line))
  }
}

export const { putStrLn, putStrLnDebug, putStrLnErr, put } = I.deriveLifted(ConsoleTag)(
  ['putStrLn', 'putStrLnErr', 'putStrLnDebug', 'put'],
  [],
  []
)
