import type { UnionToIntersection } from './types'

import * as A from '../Array'

export function intersect<AS extends unknown[] & { 0: unknown }>(
  ...as: AS
): UnionToIntersection<{ [k in keyof AS]: AS[k] }[number]> {
  return A.foldl_(as, {}, (a: any, b: any) => ({ ...a, ...b })) as any
}
