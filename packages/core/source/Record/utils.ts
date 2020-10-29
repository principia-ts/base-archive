import type { ReadonlyRecord } from "./model";

export const keys = <N extends string>(r: ReadonlyRecord<N, unknown>): ReadonlyArray<N> => Object.keys(r) as any;

export const size = (r: ReadonlyRecord<string, unknown>): number => Object.keys(r).length;
