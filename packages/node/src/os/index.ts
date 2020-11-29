import os from "os";
import * as Sy from "@principia/core/Sync";
import { Integer } from "@principia/core/Integer";

export const arch = Sy.total(os.arch);

export const cpus = Sy.total(os.cpus);

export const endianness = Sy.total(os.endianness);

export const freemem = Sy.total(os.freemem);

export const homedir = Sy.total(os.homedir);

export const hostname = Sy.total(os.hostname);

export const loadavg = Sy.total(os.loadavg);

export const networkInterfaces = Sy.total(os.networkInterfaces);

export const platform = Sy.total(os.platform);

export const release = Sy.total(os.release);

export function setPriority(pid: number, priority: number): Sy.EIO<Error, void> {
  return Sy.partial_(
    () => os.setPriority(pid, priority),
    (err) => err as Error
  );
}

export const tmpdir = Sy.total(os.tmpdir);

export const type = Sy.total(os.type);

export const uptime = Sy.total(os.uptime);

export function userInfo(options: { encoding: "buffer" }): Sy.IO<os.UserInfo<Buffer>>;
export function userInfo(options?: { encoding: BufferEncoding }): Sy.IO<os.UserInfo<string>>;
export function userInfo(options?: any): Sy.IO<os.UserInfo<string | Buffer>> {
  return Sy.total(() => os.userInfo(options));
}

export const version = Sy.total(os.version);

export { constants, EOL } from "os";
