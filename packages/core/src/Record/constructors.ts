import type { ReadonlyRecord } from "./model";

export const empty: ReadonlyRecord<string, never> = {};

export function fromRecord<N extends string, A>(r: Record<N, A>): ReadonlyRecord<N, A> {
  return Object.assign({}, r);
}

export function toRecord<N extends string, A>(r: ReadonlyRecord<N, A>): Record<N, A> {
  return Object.assign({}, r);
}

export function singleton<N extends string, A>(k: N, a: A): ReadonlyRecord<N, A> {
  return { [k]: a } as any;
}
