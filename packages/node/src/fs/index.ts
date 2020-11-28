import * as A from "@principia/core/Array";
import * as E from "@principia/core/Either";
import { pipe } from "@principia/core/Function";
import { Integer } from "@principia/core/Integer";
import * as O from "@principia/core/Option";
import * as T from "@principia/core/Task";
import * as M from "@principia/core/Task/Managed";
import * as S from "@principia/core/Task/Stream";
import * as Push from "@principia/core/Task/Stream/internal/Push";
import * as Sink from "@principia/core/Task/Stream/Sink";
import * as XQ from "@principia/core/Task/XQueue";
import * as XR from "@principia/core/Task/XRef";
import * as N from "@principia/prelude/Newtype";
import * as fs from "fs";

type ErrnoException = NodeJS.ErrnoException;

const FileDescriptor = N.typeDef<number>()("FileDescriptor");
interface FileDescriptor extends N.TypeOf<typeof FileDescriptor> {}

function unitErrorCallback(
  cb: (_: T.Task<unknown, ErrnoException, void>) => void
): (err: ErrnoException | null) => void {
  return (err) => (err ? cb(T.fail(err)) : cb(T.unit()));
}

export function access(path: fs.PathLike, mode: number | undefined): T.EIO<ErrnoException, void> {
  return T.async<unknown, ErrnoException, void>((cb) => {
    fs.access(path, mode, (err) => (err ? cb(T.fail(err)) : cb(T.unit())));
  });
}

export function appendFile(
  path: fs.PathLike | FileDescriptor,
  data: string | Buffer,
  options?: fs.WriteFileOptions
): T.EIO<ErrnoException, void> {
  return T.async<unknown, ErrnoException, void>((cb) => {
    fs.appendFile(path as any, data, options ?? {}, (err) =>
      err ? cb(T.fail(err)) : cb(T.unit())
    );
  });
}

export function chmod(path: fs.PathLike, mode: fs.Mode): T.EIO<ErrnoException, void> {
  return T.async<unknown, ErrnoException, void>((cb) => {
    fs.chmod(path, mode, (err) => (err ? cb(T.fail(err)) : cb(T.unit())));
  });
}

export function close(fd: FileDescriptor): T.EIO<ErrnoException, void> {
  return T.async<unknown, ErrnoException, void>((cb) => {
    fs.close(FileDescriptor.unwrap(fd), (err) => (err ? cb(T.fail(err)) : cb(T.unit())));
  });
}

export function chown(path: fs.PathLike, uid: number, gid: number): T.EIO<ErrnoException, void> {
  return T.async<unknown, ErrnoException, void>((cb) => {
    fs.chown(path, uid, gid, (err) => (err ? cb(T.fail(err)) : cb(T.unit())));
  });
}

export function copyFile(
  src: fs.PathLike,
  dest: fs.PathLike,
  flags: number
): T.EIO<ErrnoException, void> {
  return T.async<unknown, ErrnoException, void>((cb) => {
    fs.copyFile(src, dest, flags, (err) => (err ? cb(T.fail(err)) : cb(T.unit())));
  });
}

interface CreateReadStreamOptions {
  chunkSize?: number;
  flags?: fs.OpenMode;
  mode?: string | number;
  start?: Integer;
  end?: Integer;
}

export function createReadStream(
  path: fs.PathLike,
  options?: CreateReadStreamOptions
): S.Stream<unknown, ErrnoException, Buffer> {
  return S.chain_(
    S.bracket_(
      T.bothPar_(
        open(path, options?.flags ?? fs.constants.O_RDONLY, options?.mode),
        T.suspend(() => {
          const start = options?.start ? Integer.unwrap(options?.start) : 0;
          const end = options?.end ? Integer.unwrap(options?.end) : Infinity;
          if (end < start) {
            return T.fail(new RangeError(`start (${start}) must be <= end (${end})`));
          } else {
            return XR.make([start, end] as const);
          }
        })
      ),
      ([fd, _]) => T.orDie(close(fd))
    ),
    ([fd, state]) =>
      S.repeatTaskChunkOption(
        T.gen(function* (_) {
          const [pos, end] = yield* _(state.get);
          const n = Math.min(end - pos + 1, options?.chunkSize ?? 64);
          const [bytes, chunk] = yield* _(pipe(read(fd, n, pos), T.mapError(O.some)));

          yield* _(T.when_(T.fail(O.none()), () => bytes === 0));
          yield* _(state.set([pos + n, end]));
          if (bytes !== chunk.length) {
            const dst = Buffer.allocUnsafeSlow(bytes);
            chunk.copy(dst, 0, 0, bytes);
            return [dst];
          } else {
            return [chunk];
          }
        })
      )
  );
}

interface CreateWriteSinkOptions {
  flags?: fs.OpenMode;
  mode?: string | number;
  start?: Integer;
}

export function createWriteSink(
  path: fs.PathLike,
  options?: CreateWriteSinkOptions
): Sink.Sink<unknown, ErrnoException, Buffer, never, void> {
  return new Sink.Sink(
    M.gen(function* (_) {
      const errorRef = yield* _(XR.make<O.Option<ErrnoException>>(O.none()));
      const st = yield* _(
        M.catchAll_(
          M.makeExit_(
            T.bothPar_(
              open(
                path,
                options?.flags ?? fs.constants.O_CREAT | fs.constants.O_WRONLY,
                options?.mode
              ),
              XR.make(options?.start ? Integer.unwrap(options.start) : undefined)
            ),
            ([fd, _]) => T.orDie(close(fd))
          ),
          (err) => T.toManaged_(errorRef.set(O.some(err)))
        )
      );
      const maybeError = yield* _(errorRef.get);
      if (!st && O.isSome(maybeError)) {
        return (_: O.Option<ReadonlyArray<Buffer>>) => Push.fail(maybeError.value, []);
      } else {
        return (is: O.Option<ReadonlyArray<Buffer>>) =>
          O.fold_(
            is,
            () => Push.emit(undefined, []),
            (bufs) =>
              pipe(
                (st[1] as XR.Ref<number | undefined>).get,
                T.chain((pos) => writev(st[0], bufs, pos)),
                T.chain((_) =>
                  XR.update_(st[1] as XR.Ref<number | undefined>, (n) =>
                    n ? A.reduce_(bufs, n, (b, a) => b + a.length) : undefined
                  )
                ),
                T.chain((_) => Push.more),
                T.mapError((err) => [E.left(err), []])
              )
          );
      }
    })
  );
}

export function fchmod(fd: FileDescriptor, mode: fs.Mode): T.EIO<ErrnoException, void> {
  return T.async<unknown, ErrnoException, void>((cb) => {
    fs.fchmod(FileDescriptor.unwrap(fd), mode, unitErrorCallback(cb));
  });
}

export function fchown(fd: FileDescriptor, uid: number, gid: number): T.EIO<ErrnoException, void> {
  return T.async<unknown, ErrnoException, void>((cb) => {
    fs.fchown(FileDescriptor.unwrap(fd), uid, gid, unitErrorCallback(cb));
  });
}

export function fdatasync(fd: FileDescriptor): T.EIO<ErrnoException, void> {
  return T.async<unknown, ErrnoException, void>((cb) => {
    fs.fdatasync(FileDescriptor.unwrap(fd), unitErrorCallback(cb));
  });
}

export function fstat(fd: FileDescriptor): T.EIO<ErrnoException, fs.Stats> {
  return T.async<unknown, ErrnoException, fs.Stats>((cb) => {
    fs.fstat(FileDescriptor.unwrap(fd), (err, stats) =>
      err ? cb(T.fail(err)) : cb(T.succeed(stats))
    );
  });
}

export function fsync(fd: FileDescriptor): T.EIO<ErrnoException, void> {
  return T.async<unknown, ErrnoException, void>((cb) => {
    fs.fsync(FileDescriptor.unwrap(fd), unitErrorCallback(cb));
  });
}

export function ftruncate(fd: FileDescriptor, len: number): T.EIO<ErrnoException, void> {
  return T.async<unknown, ErrnoException, void>((cb) => {
    fs.ftruncate(FileDescriptor.unwrap(fd), len, unitErrorCallback(cb));
  });
}

export function futimes(
  fd: FileDescriptor,
  atime: string | number | Date,
  mtime: string | number | Date
): T.EIO<ErrnoException, void> {
  return T.async<unknown, ErrnoException, void>((cb) => {
    fs.futimes(FileDescriptor.unwrap(fd), atime, mtime, unitErrorCallback(cb));
  });
}

export function lchmod(path: fs.PathLike, mode: fs.Mode): T.EIO<ErrnoException, void> {
  return T.async<unknown, ErrnoException, void>((cb) => {
    fs.lchmod(path, mode, unitErrorCallback(cb));
  });
}

export function lchown(path: fs.PathLike, uid: number, gid: number): T.EIO<ErrnoException, void> {
  return T.async<unknown, ErrnoException, void>((cb) => {
    fs.lchown(path, uid, gid, unitErrorCallback(cb));
  });
}

export function lutimes(
  path: fs.PathLike,
  atime: string | number | Date,
  mtime: string | number | Date
): T.EIO<ErrnoException, void> {
  return T.async<unknown, ErrnoException, void>((cb) => {
    fs.lutimes(path, atime, mtime, unitErrorCallback(cb));
  });
}

export function link(path: fs.PathLike, newPath: fs.PathLike): T.EIO<ErrnoException, void> {
  return T.async<unknown, ErrnoException, void>((cb) => {
    fs.link(path, newPath, (err) => (err ? cb(T.fail(err)) : cb(T.unit())));
  });
}

export function lstat(path: fs.PathLike): T.EIO<ErrnoException, fs.Stats> {
  return T.async<unknown, ErrnoException, fs.Stats>((cb) => {
    fs.lstat(path, (err, stats) => (err ? cb(T.fail(err)) : cb(T.succeed(stats))));
  });
}

export function mkdir(
  path: fs.PathLike,
  options?: { recursive?: boolean; mode?: fs.Mode }
): T.EIO<ErrnoException, O.Option<string>> {
  return T.async<unknown, ErrnoException, O.Option<string>>((cb) => {
    fs.mkdir(path, options, (err, path) =>
      err ? cb(T.fail(err)) : cb(T.succeed(O.fromNullable(path)))
    );
  });
}

export function mkdtemp(
  prefix: string,
  options?: { encoding?: BufferEncoding }
): T.EIO<ErrnoException, string> {
  return T.async<unknown, ErrnoException, string>((cb) => {
    fs.mkdtemp(prefix, options, (err, folder) => (err ? cb(T.fail(err)) : cb(T.succeed(folder))));
  });
}

export function open(
  path: fs.PathLike,
  flags: fs.OpenMode,
  mode?: string | number
): T.EIO<NodeJS.ErrnoException, FileDescriptor> {
  return T.async<unknown, ErrnoException, FileDescriptor>((cb) => {
    fs.open(path, flags, mode ?? null, (err, fd) =>
      err ? cb(T.fail(err)) : cb(T.succeed(FileDescriptor.wrap(fd)))
    );
  });
}

export class Dir {
  readonly path: string;
  private readonly _dir: fs.Dir;
  constructor(dir: fs.Dir) {
    this.path = dir.path;
    this._dir = dir;
  }

  close(): T.EIO<ErrnoException, void> {
    return T.async<unknown, ErrnoException, void>((cb) => {
      this._dir.close(unitErrorCallback(cb));
    });
  }

  read(): T.EIO<ErrnoException, O.Option<fs.Dirent>> {
    return T.async<unknown, ErrnoException, O.Option<fs.Dirent>>((cb) => {
      this._dir.read((err, dirEnt) =>
        err ? cb(T.fail(err)) : cb(T.succeed(O.fromNullable(dirEnt)))
      );
    });
  }
}

export function opendir(
  path: fs.PathLike,
  options?: fs.OpenDirOptions
): T.EIO<ErrnoException, Dir> {
  return T.async<unknown, ErrnoException, Dir>((cb) => {
    fs.opendir(path as any, options ?? {}, (err, dir) =>
      err ? cb(T.fail(err)) : cb(T.succeed(new Dir(dir)))
    );
  });
}

export function read(
  fd: FileDescriptor,
  length: number,
  position?: number
): T.EIO<ErrnoException, readonly [number, Buffer]> {
  return T.async<unknown, ErrnoException, readonly [number, Buffer]>((cb) => {
    const buf = Buffer.alloc(length);
    fs.read(FileDescriptor.unwrap(fd), buf, 0, length, position ?? null, (err, bytesRead, buffer) =>
      err ? cb(T.fail(err)) : cb(T.succeed([bytesRead, buffer]))
    );
  });
}

export function readdir(
  path: fs.PathLike,
  options?: {
    encoding?: BufferEncoding;
    withFileTypes?: false;
  }
): T.EIO<ErrnoException, ReadonlyArray<string>>;
export function readdir(
  path: fs.PathLike,
  options: {
    encoding: "buffer";
    withFileTypes?: false;
  }
): T.EIO<ErrnoException, ReadonlyArray<Buffer>>;
export function readdir(
  path: fs.PathLike,
  options: {
    encoding?: BufferEncoding;
    withFileTypes: true;
  }
): T.EIO<ErrnoException, ReadonlyArray<Dir>>;
export function readdir(
  path: fs.PathLike,
  options?: {
    encoding?: BufferEncoding | "buffer";
    withFileTypes?: boolean;
  }
): T.EIO<ErrnoException, ReadonlyArray<any>> {
  return T.async((cb) => {
    fs.readdir(path, options ?? ({} as any), (err, files: any) =>
      err
        ? cb(T.fail(err))
        : files[0] && files[0] instanceof fs.Dir
        ? A.map_(files, (a: fs.Dir) => new Dir(a))
        : files
    );
  });
}

export function realpath(
  path: fs.PathLike,
  options?: {
    encoding?: BufferEncoding;
  }
): T.EIO<ErrnoException, string>;
export function realpath(
  path: fs.PathLike,
  options: {
    encoding: "buffer";
  }
): T.EIO<ErrnoException, Buffer>;
export function realpath(path: fs.PathLike, options?: any): T.EIO<ErrnoException, any> {
  return T.async<unknown, ErrnoException, any>((cb) => {
    fs.realpath(path, options ?? {}, (err, resolvedPath) =>
      err ? cb(T.fail(err)) : cb(T.succeed(resolvedPath))
    );
  });
}

export function realpathNative(
  path: fs.PathLike,
  options?: {
    encoding?: BufferEncoding;
  }
): T.EIO<ErrnoException, string>;
export function realpathNative(
  path: fs.PathLike,
  options: {
    encoding: "buffer";
  }
): T.EIO<ErrnoException, Buffer>;
export function realpathNative(path: fs.PathLike, options?: any): T.EIO<ErrnoException, any> {
  return T.async<unknown, ErrnoException, any>((cb) => {
    fs.realpath.native(path, options ?? {}, (err, resolvedPath) =>
      err ? cb(T.fail(err)) : cb(T.succeed(resolvedPath))
    );
  });
}

export function rename(oldPath: fs.PathLike, newPath: fs.PathLike): T.EIO<ErrnoException, void> {
  return T.async<unknown, ErrnoException, void>((cb) => {
    fs.rename(oldPath, newPath, unitErrorCallback(cb));
  });
}

export function rm(path: fs.PathLike, options?: fs.RmOptions): T.EIO<ErrnoException, void> {
  return T.async<unknown, NodeJS.ErrnoException, void>((cb) => {
    fs.rm(path, options ?? {}, unitErrorCallback(cb));
  });
}

export function rmdir(path: fs.PathLike, options?: fs.RmDirOptions): T.EIO<ErrnoException, void> {
  return T.async<unknown, NodeJS.ErrnoException, void>((cb) => {
    fs.rmdir(path, options ?? {}, unitErrorCallback(cb));
  });
}

export function stat(
  path: fs.PathLike,
  options?: { bigint?: false }
): T.EIO<ErrnoException, fs.Stats>;
export function stat(
  path: fs.PathLike,
  options: { bigint: true }
): T.EIO<ErrnoException, fs.BigIntStats>;
export function stat(
  path: fs.PathLike,
  options?: { bigint?: boolean }
): T.EIO<ErrnoException, fs.Stats | fs.BigIntStats> {
  return T.async<unknown, ErrnoException, fs.Stats | fs.BigIntStats>((cb) => {
    fs.stat(path, options ?? ({} as any), (err, stats) =>
      err ? cb(T.fail(err)) : cb(T.succeed(stats))
    );
  });
}

export function symlink(target: fs.PathLike, path: fs.PathLike): T.EIO<ErrnoException, void> {
  return T.async<unknown, ErrnoException, void>((cb) => {
    fs.symlink(target, path, unitErrorCallback(cb));
  });
}

export function truncate(path: fs.PathLike, len?: number): T.EIO<ErrnoException, void> {
  return T.async<unknown, ErrnoException, void>((cb) => {
    fs.truncate(path, len, unitErrorCallback(cb));
  });
}

export function unlink(path: fs.PathLike): T.EIO<ErrnoException, void> {
  return T.async<unknown, ErrnoException, void>((cb) => {
    fs.unlink(path, unitErrorCallback(cb));
  });
}

export function utimes(
  path: fs.PathLike,
  atime: string | number | Date,
  mtime: string | number | Date
): T.EIO<ErrnoException, void> {
  return T.async<unknown, ErrnoException, void>((cb) => {
    fs.utimes(path, atime, mtime, unitErrorCallback(cb));
  });
}

export function write(
  fd: FileDescriptor,
  buffer: Buffer,
  position?: number
): T.EIO<ErrnoException, number> {
  return T.async<unknown, ErrnoException, number>((cb) => {
    fs.write(
      FileDescriptor.unwrap(fd),
      buffer,
      position ?? null,
      buffer.byteLength,
      (err, bytesWritten) => (err ? cb(T.fail(err)) : cb(T.succeed(bytesWritten)))
    );
  });
}

export function writev(
  fd: FileDescriptor,
  buffers: ReadonlyArray<Buffer>,
  position?: number
): T.EIO<ErrnoException, number> {
  return T.async<unknown, ErrnoException, number>((cb) => {
    if (position) {
      fs.writev(FileDescriptor.unwrap(fd), buffers, position, (err, bytesWritten) =>
        err ? cb(T.fail(err)) : cb(T.succeed(bytesWritten))
      );
    } else {
      fs.writev(FileDescriptor.unwrap(fd), buffers, (err, bytesWritten) =>
        err ? cb(T.fail(err)) : cb(T.succeed(bytesWritten))
      );
    }
  });
}

export function watch(
  filename: fs.PathLike,
  options: {
    persistent?: boolean;
    recursive?: boolean;
    encoding: "buffer";
  }
): S.Stream<unknown, Error, { eventType: "rename" | "change"; filename: Buffer }>;
export function watch(
  filename: fs.PathLike,
  options?: {
    persistent?: boolean;
    recursive?: boolean;
    encoding?: BufferEncoding;
  }
): S.Stream<unknown, Error, { eventType: "rename" | "change"; filename: string }>;
export function watch(
  filename: fs.PathLike,
  options?: any
): S.Stream<unknown, Error, { eventType: "rename" | "change"; filename: string | Buffer }> {
  return S.chain_(
    S.fromTask(
      T.partial_(
        () => fs.watch(filename, options ?? {}),
        (err) => err as Error
      )
    ),
    (watcher) =>
      S.repeatTaskOption(
        T.async<
          unknown,
          O.Option<Error>,
          { eventType: "rename" | "change"; filename: string | Buffer }
        >((cb) => {
          watcher.once("change", (eventType, filename) => {
            watcher.removeAllListeners();
            cb(T.succeed({ eventType: eventType as any, filename }));
          });
          watcher.once("error", (error) => {
            watcher.removeAllListeners();
            cb(T.fail(O.some(error)));
          });
          watcher.once("close", () => {
            watcher.removeAllListeners();
            cb(T.fail(O.none()));
          });
        })
      )
  );
}

export function watchFile(
  filename: fs.PathLike,
  options: {
    bigint: true;
    persistent?: boolean;
    interval?: Integer;
  }
): S.Stream<unknown, never, [fs.BigIntStats, fs.BigIntStats]>;
export function watchFile(
  filename: fs.PathLike,
  options?: {
    bigint?: false;
    persistent?: boolean;
    interval?: Integer;
  }
): S.Stream<unknown, never, [fs.Stats, fs.Stats]>;
export function watchFile(
  filename: fs.PathLike,
  options?: any
): S.Stream<unknown, never, [fs.BigIntStats | fs.Stats, fs.BigIntStats | fs.Stats]> {
  return S.chain_(
    S.bracket_(
      T.gen(function* (_) {
        const q = yield* _(
          XQ.makeUnbounded<[fs.BigIntStats | fs.Stats, fs.BigIntStats | fs.Stats]>()
        );
        fs.watchFile(filename, options ?? {}, (curr, prev) => {
          T.run(q.offer([curr, prev]));
        });
        return q;
      }),
      (q) => q.shutdown
    ),
    (q) => S.repeatTaskOption(q.take)
  );
}
