import type { UnionToIntersection } from '@principia/base/util/types'

export function intersect<AS extends ReadonlyArray<unknown> & { 0: unknown }>(
  ...as: AS
): UnionToIntersection<{ [K in keyof AS]: AS[K] }[number]> {
  return as.reduce((b: any, a: any) => ({ ...b, ...a })) as any
}
