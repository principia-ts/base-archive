import { descriptorWith, pure } from '../core'

export function fiberId() {
  return descriptorWith((d) => pure(d.id))
}
