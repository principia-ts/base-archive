import type { Byte } from "@principia/core/Byte";
import type { Chunk } from "@principia/core/Chunk";
import * as C from "@principia/core/Chunk";
import type * as E from "@principia/core/Either";
import { tuple } from "@principia/core/Function";
import * as I from "@principia/core/IO";
import * as O from "@principia/core/Option";
import * as S from "@principia/core/Stream";
import * as Push from "@principia/core/Stream/Push";
import * as Sink from "@principia/core/Stream/Sink";
import type { FSync, USync } from "@principia/core/Sync";
import * as Sy from "@principia/core/Sync";
import { once } from "events";

export class StdinError {
  readonly _tag = "StdinError";
  constructor(readonly error: Error) {}
}

export const stdin: S.FStream<StdinError, Byte> = S.chain_(
  S.fromEffect(I.total(() => tuple(process.stdin.resume(), new Array<() => void>()))),
  ([rs, cleanup]) =>
    S.ensuring_(
      S.async<unknown, StdinError, Byte>((cb) => {
        const onData = (data: Buffer) => {
          cb(I.succeed(C.fromBuffer(data)));
        };
        const onError = (err: Error) => {
          cb(I.fail(O.some(new StdinError(err))));
        };
        cleanup.push(
          () => {
            rs.removeListener("error", onError);
          },
          () => {
            rs.removeListener("data", onData);
          },
          () => {
            rs.pause();
          }
        );
        rs.on("data", onData);
        rs.on("error", onError);
      }),
      I.total(() => {
        cleanup.forEach((h) => {
          h();
        });
      })
    )
);

export class StdoutError {
  readonly _tag = "StdoutError";
  constructor(readonly error: Error) {}
}

export const stdout: Sink.Sink<unknown, StdoutError, Buffer, never, void> = Sink.fromPush((is) =>
  O.fold_(
    is,
    () => Push.emit(undefined, []),
    (bufs) =>
      I.async<unknown, readonly [E.Either<StdoutError, void>, Chunk<never>], void>(async (cb) => {
        for (let i = 0; i < bufs.length; i++) {
          if (
            !process.stdout.write(bufs[i], (err) => err && cb(Push.fail(new StdoutError(err), [])))
          )
            await once(process.stdout, "drain");
        }
        cb(Push.more);
      })
  )
);

export function abort(): USync<never> {
  return Sy.total(process.abort);
}

export function chdir(directory: string): FSync<Error, void> {
  return Sy.partial_(
    () => process.chdir(directory),
    (err) => err as Error
  );
}

export function cpuUsage(previousValue?: NodeJS.CpuUsage): USync<NodeJS.CpuUsage> {
  return Sy.total(() => process.cpuUsage(previousValue));
}

export function cwd(): USync<string> {
  return Sy.total(() => process.cwd());
}

export function emitWarning(
  warning: string | Error,
  options?: {
    type?: string;
    code?: string;
    ctor?: Function;
    detail?: string;
  }
): USync<void> {
  return Sy.total(() => process.emitWarning(warning, options as any));
}

export function exit(code?: number): USync<never> {
  return Sy.total(() => process.exit(code));
}

export const exitCode = Sy.total(() => process.exitCode);

export function hrtime(time?: readonly [number, number]): USync<readonly [number, number]> {
  return Sy.total(() => process.hrtime(time as any));
}

export const hrtimeBigint = Sy.total(() => process.hrtime.bigint());

export const memoryUsage = Sy.total(process.memoryUsage);

export const resourceUsage = Sy.total(process.resourceUsage);

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
} from "process";
