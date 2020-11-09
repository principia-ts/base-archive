import type { Tuple } from "./model";

export const fst = <A, I>(ai: Tuple<A, I>): A => ai[0];

export const snd = <A, I>(ai: Tuple<A, I>): I => ai[1];
