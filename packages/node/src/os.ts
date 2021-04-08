import type { FSync, USync } from '@principia/base/Sync'

import * as Sy from '@principia/base/Sync'
import os from 'os'

export const arch = Sy.effectTotal(os.arch)

export const cpus = Sy.effectTotal(os.cpus)

export const endianness = Sy.effectTotal(os.endianness)

export const freemem = Sy.effectTotal(os.freemem)

export const homedir = Sy.effectTotal(os.homedir)

export const hostname = Sy.effectTotal(os.hostname)

export const loadavg = Sy.effectTotal(os.loadavg)

export const networkInterfaces = Sy.effectTotal(os.networkInterfaces)

export const platform = Sy.effectTotal(os.platform)

export const release = Sy.effectTotal(os.release)

export function setPriority(pid: number, priority: number): FSync<Error, void> {
  return Sy.effectCatch_(
    () => os.setPriority(pid, priority),
    (err) => err as Error
  )
}

export const tmpdir = Sy.effectTotal(os.tmpdir)

export const type = Sy.effectTotal(os.type)

export const uptime = Sy.effectTotal(os.uptime)

export function userInfo(options: { encoding: 'buffer' }): USync<os.UserInfo<Buffer>>
export function userInfo(options?: { encoding: BufferEncoding }): USync<os.UserInfo<string>>
export function userInfo(options?: any): USync<os.UserInfo<string | Buffer>> {
  return Sy.effectTotal(() => os.userInfo(options))
}

export const version = Sy.effectTotal(os.version)

export { constants, EOL } from 'os'
