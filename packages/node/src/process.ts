import type { Byte } from '@principia/base/Byte'
import type * as E from '@principia/base/Either'
import type { Chunk } from '@principia/io/Chunk'
import type { FSync, USync } from '@principia/io/Sync'

import { pipe, tuple } from '@principia/base/Function'
import * as O from '@principia/base/Option'
import * as C from '@principia/io/Chunk'
import * as I from '@principia/io/IO'
import * as S from '@principia/io/Stream'
import * as Push from '@principia/io/Stream/Push'
import * as Sink from '@principia/io/Stream/Sink'
import * as Sy from '@principia/io/Sync'
import { once } from 'events'

export class StdinError {
  readonly _tag = 'StdinError'
  constructor(readonly error: Error) {}
}

export const stdin: S.FStream<StdinError, Byte> = pipe(
  S.fromEffect(I.effectTotal(() => tuple(process.stdin.resume(), new Array<() => void>()))),
  S.bind(([rs, cleanup]) =>
    S.ensuring_(
      S.effectAsync<unknown, StdinError, Byte>((cb) => {
        const onData  = (data: Buffer) => {
          cb(I.succeed(C.fromBuffer(data)))
        }
        const onError = (err: Error) => {
          cb(I.fail(O.Some(new StdinError(err))))
        }
        cleanup.push(
          () => {
            rs.removeListener('error', onError)
          },
          () => {
            rs.removeListener('data', onData)
          },
          () => {
            rs.pause()
          }
        )
        rs.on('data', onData)
        rs.on('error', onError)
      }),
      I.effectTotal(() => {
        cleanup.forEach((h) => {
          h()
        })
      })
    )
  )
)

export class StdoutError {
  readonly _tag = 'StdoutError'
  constructor(readonly error: Error) {}
}

export const stdout: Sink.Sink<unknown, StdoutError, Buffer, never, void> = Sink.fromPush((is) =>
  O.match_(
    is,
    () => Push.emit(undefined, []),
    (bufs) =>
      I.effectAsync<unknown, readonly [E.Either<StdoutError, void>, Chunk<never>], void>(async (cb) => {
        for (let i = 0; i < bufs.length; i++) {
          if (!process.stdout.write(bufs[i], (err) => err && cb(Push.fail(new StdoutError(err), C.empty())))) {
            await once(process.stdout, 'drain')
          }
        }
        cb(Push.more)
      })
  )
)

export function abort(): USync<never> {
  return Sy.effectTotal(process.abort)
}

export function chdir(directory: string): FSync<Error, void> {
  return Sy.effectCatch_(
    () => process.chdir(directory),
    (err) => err as Error
  )
}

export function cpuUsage(previousValue?: NodeJS.CpuUsage): USync<NodeJS.CpuUsage> {
  return Sy.effectTotal(() => process.cpuUsage(previousValue))
}

export function cwd(): USync<string> {
  return Sy.effectTotal(() => process.cwd())
}

export function emitWarning(
  warning: string | Error,
  options?: {
    type?: string
    code?: string
    ctor?: Function
    detail?: string
  }
): USync<void> {
  return Sy.effectTotal(() => process.emitWarning(warning, options as any))
}

export function exit(code?: number): USync<never> {
  return Sy.effectTotal(() => process.exit(code))
}

export const exitCode = Sy.effectTotal(() => process.exitCode)

export function hrtime(time?: readonly [number, number]): USync<readonly [number, number]> {
  return Sy.effectTotal(() => process.hrtime(time as any))
}

export const hrtimeBigint = Sy.effectTotal(() => process.hrtime.bigint())

export const memoryUsage = Sy.effectTotal(process.memoryUsage)

export const resourceUsage = Sy.effectTotal(process.resourceUsage)

export {
  allowedNodeEnvironmentFlags,
  arch,
  argv,
  argv0,
  config,
  connected,
  debugPort,
  env,
  execArgv,
  execPath,
  pid,
  platform,
  ppid,
  release,
  traceDeprecation,
  version,
  versions
} from 'process'
