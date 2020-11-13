import type { Tuple } from "./model";

export function fst<A, I>(ai: Tuple<A, I>): A {
   return ai[0];
}

export function snd<A, I>(ai: Tuple<A, I>): I {
   return ai[1];
}
