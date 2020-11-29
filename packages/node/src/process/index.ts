import * as Sy from "@principia/core/Sync";
import * as S from "@principia/core/Task/Stream";
import * as T from "@principia/core/Task";
import * as XQ from "@principia/core/Task/XQueue";
import * as E from "@principia/core/Either";
import * as Sink from "@principia/core/Task/Stream/Sink";
import * as Push from "@principia/core/Task/Stream/internal/Push";
import * as O from "@principia/core/Option";
import { once } from "events";

function stdinDataCb(queue: XQ.Queue<E.Either<Error, Buffer>>): (data: Buffer) => void {
  return (data) => {
    T.run(queue.offer(E.right(data)));
  };
}

function stdinErrorCb(queue: XQ.Queue<E.Either<Error, Buffer>>): (err: Error) => void {
  return (err) => {
    T.run(queue.offer(E.left(err)));
  };
}

export const stdin: S.Stream<unknown, never, E.Either<Error, Buffer>> = S.chain_(
  S.bracket_(
    T.gen(function* (_) {
      const q = yield* _(XQ.makeUnbounded<E.Either<Error, Buffer>>());
      process.stdin.resume();
      process.stdin.on("data", stdinDataCb(q));
      process.stdin.on("error", stdinErrorCb(q));
      return q;
    }),
    (q) =>
      T.andThen_(
        q.shutdown,
        T.total(() => {
          process.stdin.removeListener("data", stdinDataCb);
          process.stdin.removeListener("error", stdinErrorCb);
          process.stdin.pause();
        })
      )
  ),
  (q) => S.repeatTaskOption(q.take)
);

function stdoutErrorCb(
  cb: (_: T.Task<unknown, readonly [E.Either<Error, void>, ReadonlyArray<never>], void>) => void
): (err?: Error) => void {
  return (err) => (err ? cb(Push.fail(err, [])) : undefined);
}

export const stdout: Sink.Sink<unknown, Error, Buffer, never, void> = Sink.fromPush((is) =>
  O.fold_(
    is,
    () => Push.emit(undefined, []),
    (bufs) =>
      T.async<unknown, readonly [E.Either<Error, void>, ReadonlyArray<never>], void>(async (cb) => {
        for (let i = 0; i < bufs.length; i++) {
          if (!process.stdout.write(bufs[i], stdoutErrorCb(cb)))
            await once(process.stdout, "drain");
        }
        cb(Push.more);
      })
  )
);

export function abort(): Sy.IO<never> {
  return Sy.total(process.abort);
}

export function chdir(directory: string): Sy.EIO<Error, void> {
  return Sy.partial_(
    () => process.chdir(directory),
    (err) => err as Error
  );
}

export function cpuUsage(previousValue?: NodeJS.CpuUsage): Sy.IO<NodeJS.CpuUsage> {
  return Sy.total(() => process.cpuUsage(previousValue));
}

export function cwd(): Sy.IO<string> {
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
): Sy.IO<void> {
  return Sy.total(() => process.emitWarning(warning, options as any));
}

export function exit(code?: number): Sy.IO<never> {
  return Sy.total(() => process.exit(code));
}

export const exitCode = Sy.total(() => process.exitCode);

export function hrtime(time?: readonly [number, number]): Sy.IO<readonly [number, number]> {
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
