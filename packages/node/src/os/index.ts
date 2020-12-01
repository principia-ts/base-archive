import type { FSync, USync } from "@principia/core/Sync";
import * as Sy from "@principia/core/Sync";
import os from "os";

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

export function setPriority(pid: number, priority: number): FSync<Error, void> {
  return Sy.partial_(
    () => os.setPriority(pid, priority),
    (err) => err as Error
  );
}

export const tmpdir = Sy.total(os.tmpdir);

export const type = Sy.total(os.type);

export const uptime = Sy.total(os.uptime);

export function userInfo(options: { encoding: "buffer" }): USync<os.UserInfo<Buffer>>;
export function userInfo(options?: { encoding: BufferEncoding }): USync<os.UserInfo<string>>;
export function userInfo(options?: any): USync<os.UserInfo<string | Buffer>> {
  return Sy.total(() => os.userInfo(options));
}

export const version = Sy.total(os.version);

export { constants, EOL } from "os";
