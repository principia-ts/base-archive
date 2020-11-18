import type { ReadonlyRecord } from "./model";

export function keys<N extends string>(r: ReadonlyRecord<N, unknown>): ReadonlyArray<N> {
  return Object.keys(r) as any;
}

export function size(r: ReadonlyRecord<string, unknown>): number {
  return Object.keys(r).length;
}
