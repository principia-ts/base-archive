import { ReadonlyRecord } from "./Record";

export const empty: ReadonlyRecord<string, never> = {};

export const fromRecord = <N extends string, A>(r: Record<N, A>): ReadonlyRecord<N, A> =>
   Object.assign({}, r);

export const toRecord = <N extends string, A>(r: ReadonlyRecord<N, A>): Record<N, A> =>
   Object.assign({}, r);

export const singleton = <N extends string, A>(k: N, a: A): ReadonlyRecord<N, A> =>
   ({ [k]: a } as any);
